import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import type { Deps, WaitlistRole } from '../src/app.js';

function setup(opts = {}) {
  const added: [string, WaitlistRole, string][] = [];
  const deps: Deps = {
    pingDb: async () => {},
    pingRedis: async () => {},
    addToWaitlist: async (e, r, s) => void added.push([e, r, s]),
  };
  return { app: buildApp(deps, opts), added };
}
const post = (app: ReturnType<typeof buildApp>, payload: unknown, ip = '10.0.0.1') =>
  app.inject({ method: 'POST', url: '/v1/waitlist', payload: payload as object, remoteAddress: ip });

describe('POST /v1/waitlist', () => {
  it('stores a normalized email and answers 201', async () => {
    const { app, added } = setup();
    const res = await post(app, { email: '  Ada@Example.COM ', role: 'owner', source: 'final' });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ ok: true });
    expect(added).toEqual([['ada@example.com', 'owner', 'final']]);
  });

  it('rejects a bad email or role with a readable message', async () => {
    const { app, added } = setup();
    const bad = await post(app, { email: 'not-an-email', role: 'owner' });
    expect(bad.statusCode).toBe(400);
    expect(bad.json()).toEqual({ error: { code: 'invalid_body', message: 'Enter a valid email address.' } });
    expect((await post(app, { email: 'a@b.co', role: 'whale' })).json().error.message).toBe(
      'Pick what brings you here.',
    );
    expect((await post(app, { email: 'a@b.co', role: 'owner', source: '<script>' })).statusCode).toBe(400);
    expect(added).toHaveLength(0);
  });

  it('limits signups per IP', async () => {
    const { app } = setup({ waitlistPerMinute: 2 });
    expect((await post(app, { email: 'a@b.co', role: 'owner' })).statusCode).toBe(201);
    expect((await post(app, { email: 'b@b.co', role: 'owner' })).statusCode).toBe(201);
    const limited = await post(app, { email: 'c@b.co', role: 'owner' });
    expect(limited.statusCode).toBe(429);
    expect(limited.json()).toEqual({
      error: { code: 'rate_limited', message: 'Too many requests. Try again in a minute.' },
    });
    expect((await post(app, { email: 'd@b.co', role: 'owner' }, '10.0.0.2')).statusCode).toBe(201);
  });

  it('allows the website origin and no other', async () => {
    const { app } = setup({ corsOrigins: ['https://blackbox.example'] });
    const ok = await app.inject({
      method: 'OPTIONS',
      url: '/v1/waitlist',
      headers: { origin: 'https://blackbox.example', 'access-control-request-method': 'POST' },
    });
    expect(ok.headers['access-control-allow-origin']).toBe('https://blackbox.example');
    const evil = await app.inject({
      method: 'OPTIONS',
      url: '/v1/waitlist',
      headers: { origin: 'https://evil.example', 'access-control-request-method': 'POST' },
    });
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
  });
});
