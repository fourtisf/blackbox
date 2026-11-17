import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import type { Deps } from '../src/app.js';
import {
  createMemoryWaitlistStore,
  csvCell,
  linkToken,
  encodeEmail,
  toCsv,
  waitlistLinks,
} from '../src/waitlist.js';
import type { MailMessage } from '../src/waitlist.js';

const SECRET = 'test-secret-0123456789abcdef0123456789';
const ADMIN = 'admin-token-0123456789abcdef';
const cfg = {
  appUrl: 'https://blackbox.example',
  apiUrl: 'https://api.blackbox.example',
  secret: SECRET,
  adminToken: ADMIN,
};

function setup(
  opts: {
    mail?: boolean;
    perMinute?: number;
    corsOrigins?: string[];
    now?: () => Date;
    adminToken?: string;
  } = {},
) {
  const sent: MailMessage[] = [];
  const store = createMemoryWaitlistStore();
  const deps: Deps = {
    pingDb: async () => {},
    pingRedis: async () => {},
    waitlist: store,
    sendMail: opts.mail === false ? null : async (m) => void sent.push(m),
    ...(opts.now ? { now: opts.now } : {}),
  };
  const app = buildApp(deps, {
    corsOrigins: opts.corsOrigins ?? ['https://blackbox.example'],
    waitlist: {
      ...cfg,
      ...(opts.perMinute ? { perMinute: opts.perMinute } : {}),
      ...('adminToken' in opts ? { adminToken: opts.adminToken } : {}),
    },
  });
  return { app, sent, store };
}
const post = (app: ReturnType<typeof buildApp>, url: string, payload: unknown, ip = '10.0.0.1') =>
  app.inject({ method: 'POST', url, payload: payload as object, remoteAddress: ip });
const linkParams = (url: string) => Object.fromEntries(new URL(url).searchParams) as { e: string; t: string };

describe('POST /v1/waitlist', () => {
  it('stores a normalized email and sends one confirmation email', async () => {
    const { app, sent, store } = setup();
    const res = await post(app, '/v1/waitlist', {
      email: '  Ada@Example.COM ',
      role: 'owner',
      source: 'final',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ ok: true, confirm: true });
    expect((await store.all()).map((r) => [r.email, r.role, r.source])).toEqual([
      ['ada@example.com', 'owner', 'final'],
    ]);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe('ada@example.com');
    expect(sent[0]!.text).toContain('https://blackbox.example/waitlist/confirm?e=');
    expect(sent[0]!.headers['List-Unsubscribe']).toMatch(
      /^<https:\/\/api\.blackbox\.example\/v1\/waitlist\/unsubscribe\?e=/,
    );
    expect(sent[0]!.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  });

  it('does not email the same address again within 10 minutes', async () => {
    let t = Date.parse('2026-11-17T10:00:00Z');
    const { app, sent } = setup({ now: () => new Date(t) });
    await post(app, '/v1/waitlist', { email: 'ada@example.com', role: 'owner' });
    await post(app, '/v1/waitlist', { email: 'ada@example.com', role: 'owner' }, '10.0.0.2');
    expect(sent).toHaveLength(1);
    t += 11 * 60_000;
    await post(app, '/v1/waitlist', { email: 'ada@example.com', role: 'owner' }, '10.0.0.3');
    expect(sent).toHaveLength(2);
  });

  it('without SMTP it stores the signup and says no confirmation is coming', async () => {
    const { app, store } = setup({ mail: false });
    const res = await post(app, '/v1/waitlist', { email: 'ada@example.com', role: 'builder' });
    expect(res.json()).toEqual({ ok: true, confirm: false });
    expect(await store.all()).toHaveLength(1);
  });

  it('pretends to accept bots that fill the honeypot, and stores nothing', async () => {
    const { app, sent, store } = setup();
    const res = await post(app, '/v1/waitlist', {
      email: 'bot@spam.example',
      role: 'owner',
      website: 'http://spam.example',
    });
    expect(res.statusCode).toBe(201);
    expect(await store.all()).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it('rejects a bad email or role with a readable message', async () => {
    const { app, store } = setup();
    const bad = await post(app, '/v1/waitlist', { email: 'not-an-email', role: 'owner' });
    expect(bad.statusCode).toBe(400);
    expect(bad.json()).toEqual({ error: { code: 'invalid_body', message: 'Enter a valid email address.' } });
    expect((await post(app, '/v1/waitlist', { email: 'a@b.co', role: 'whale' })).json().error.message).toBe(
      'Pick what brings you here.',
    );
    expect(
      (await post(app, '/v1/waitlist', { email: 'a@b.co', role: 'owner', source: '<script>' })).statusCode,
    ).toBe(400);
    expect(await store.all()).toHaveLength(0);
  });

  it('limits signups per IP', async () => {
    const { app } = setup({ perMinute: 2 });
    expect((await post(app, '/v1/waitlist', { email: 'a@b.co', role: 'owner' })).statusCode).toBe(201);
    expect((await post(app, '/v1/waitlist', { email: 'b@b.co', role: 'owner' })).statusCode).toBe(201);
    const limited = await post(app, '/v1/waitlist', { email: 'c@b.co', role: 'owner' });
    expect(limited.statusCode).toBe(429);
    expect(limited.json()).toEqual({
      error: { code: 'rate_limited', message: 'Too many requests. Try again in a minute.' },
    });
    expect((await post(app, '/v1/waitlist', { email: 'd@b.co', role: 'owner' }, '10.0.0.2')).statusCode).toBe(
      201,
    );
  });

  it('behind a local proxy, limits by the forwarded client IP; ignores the header from anyone else', async () => {
    const store = createMemoryWaitlistStore();
    const app = buildApp(
      { pingDb: async () => {}, pingRedis: async () => {}, waitlist: store, sendMail: null },
      {
        trustProxy: 'loopback',
        corsOrigins: ['https://blackbox.example'],
        waitlist: { ...cfg, perMinute: 1 },
      },
    );
    const viaNginx = (ip: string, email: string) =>
      app.inject({
        method: 'POST',
        url: '/v1/waitlist',
        remoteAddress: '127.0.0.1',
        headers: { 'x-forwarded-for': ip },
        payload: { email, role: 'owner' },
      });
    expect((await viaNginx('203.0.113.1', 'a@b.co')).statusCode).toBe(201);
    expect((await viaNginx('203.0.113.2', 'b@b.co')).statusCode).toBe(201); // different visitor, own limit
    expect((await viaNginx('203.0.113.1', 'c@b.co')).statusCode).toBe(429);
    const spoof = (ip: string) =>
      app.inject({
        method: 'POST',
        url: '/v1/waitlist',
        remoteAddress: '198.51.100.7',
        headers: { 'x-forwarded-for': ip },
        payload: { email: `${ip}@b.co`, role: 'owner' },
      });
    expect((await spoof('10.1.1.1')).statusCode).toBe(201);
    expect((await spoof('10.1.1.2')).statusCode).toBe(429); // header ignored: same real IP
  });

  it('allows the website origin and no other', async () => {
    const { app } = setup({ corsOrigins: ['https://blackbox.example'] });
    const pre = (origin: string) =>
      app.inject({
        method: 'OPTIONS',
        url: '/v1/waitlist',
        headers: { origin, 'access-control-request-method': 'POST' },
      });
    expect((await pre('https://blackbox.example')).headers['access-control-allow-origin']).toBe(
      'https://blackbox.example',
    );
    expect((await pre('https://evil.example')).headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('confirm and unsubscribe links', () => {
  it('confirms with the emailed link, and rejects a forged one', async () => {
    const { app, sent, store } = setup();
    await post(app, '/v1/waitlist', { email: 'ada@example.com', role: 'owner' });
    const link = linkParams(sent[0]!.text.match(/https:\/\/blackbox\.example\/waitlist\/confirm\?\S+/)![0]);
    const forged = {
      e: encodeEmail('ada@example.com'),
      t: linkToken('wrong-secret', 'confirm', 'ada@example.com'),
    };
    expect((await post(app, '/v1/waitlist/confirm', forged)).statusCode).toBe(400);
    const unsubToken = waitlistLinks(cfg, 'ada@example.com');
    expect((await post(app, '/v1/waitlist/confirm', linkParams(unsubToken.unsubscribe))).statusCode).toBe(
      400,
    ); // wrong purpose
    expect((await post(app, '/v1/waitlist/confirm', link)).json()).toEqual({ ok: true });
    expect((await store.all())[0]!.confirmedAt).toBeInstanceOf(Date);
    expect((await post(app, '/v1/waitlist/confirm', link)).statusCode).toBe(200); // idempotent
  });

  it('a confirmed address gets no more confirmation emails', async () => {
    const { app, sent } = setup({ now: () => new Date(Date.now() + 3_600_000) });
    await post(app, '/v1/waitlist', { email: 'ada@example.com', role: 'owner' });
    await post(app, '/v1/waitlist/confirm', linkParams(waitlistLinks(cfg, 'ada@example.com').confirm));
    await post(app, '/v1/waitlist', { email: 'ada@example.com', role: 'owner' }, '10.0.0.9');
    expect(sent).toHaveLength(1);
  });

  it('unsubscribe deletes the email, from our page or one-click from a mail app', async () => {
    const { app, store } = setup({ mail: false });
    await post(app, '/v1/waitlist', { email: 'ada@example.com', role: 'owner' });
    await post(app, '/v1/waitlist', { email: 'bob@example.com', role: 'owner' }, '10.0.0.2');
    const ada = waitlistLinks(cfg, 'ada@example.com');
    expect((await post(app, '/v1/waitlist/unsubscribe', linkParams(ada.unsubscribe))).json()).toEqual({
      ok: true,
    });
    const bob = new URL(waitlistLinks(cfg, 'bob@example.com').oneClick);
    const oneClick = await app.inject({
      method: 'POST',
      url: bob.pathname + bob.search,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'List-Unsubscribe=One-Click',
    });
    expect(oneClick.statusCode).toBe(200);
    expect(await store.all()).toHaveLength(0);
    expect((await post(app, '/v1/waitlist/unsubscribe', { e: 'x', t: 'y' })).statusCode).toBe(400);
  });
});

describe('GET /v1/admin/waitlist', () => {
  const get = (app: ReturnType<typeof buildApp>, token?: string, q = '') =>
    app.inject({
      method: 'GET',
      url: `/v1/admin/waitlist${q}`,
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });

  it('is off without ADMIN_TOKEN and refuses wrong tokens', async () => {
    expect((await get(setup({ adminToken: undefined }).app, ADMIN)).statusCode).toBe(404);
    const { app } = setup();
    expect((await get(app)).statusCode).toBe(401);
    expect((await get(app, ADMIN.replace('a', 'b'))).statusCode).toBe(401);
  });

  it('returns totals, breakdowns and a CSV export', async () => {
    const { app } = setup();
    await post(app, '/v1/waitlist', { email: 'ada@example.com', role: 'owner', source: 'hero' });
    await post(
      app,
      '/v1/waitlist',
      { email: 'bob@example.com', role: 'builder', source: 'hero' },
      '10.0.0.2',
    );
    await post(app, '/v1/waitlist/confirm', linkParams(waitlistLinks(cfg, 'ada@example.com').confirm));
    const res = await get(app, ADMIN);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.json()).toMatchObject({
      total: 2,
      confirmed: 1,
      emailConfirmation: true,
      byRole: { owner: 1, builder: 1 },
      bySource: { hero: 2 },
    });
    const csv = await get(app, ADMIN, '?format=csv');
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.headers['content-disposition']).toMatch(
      /attachment; filename="blackbox-waitlist-\d{4}-\d{2}-\d{2}\.csv"/,
    );
    expect(csv.body.split('\r\n')[0]).toBe('email,role,source,created_at,confirmed_at');
    expect(csv.body).toContain('"ada@example.com","owner","hero"');
  });
});

describe('CSV safety', () => {
  it('defuses spreadsheet formulas and quotes cells', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+1')).toBe(`"'+1"`);
    expect(csvCell(null)).toBe('""');
    expect(toCsv([]).trim()).toBe('email,role,source,created_at,confirmed_at');
  });
});
