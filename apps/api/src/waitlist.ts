/**
 * Launch waitlist: sign up, confirm by email (double opt-in, when SMTP is configured),
 * unsubscribe, and an admin export protected by ADMIN_TOKEN.
 *
 * Confirm and unsubscribe links carry the email and an HMAC of it, so nothing secret is stored
 * and links keep working. Every public answer is the same for new and known emails, so the
 * endpoints never reveal who signed up.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

export type WaitlistRole = 'owner' | 'builder' | 'curious';

export interface WaitlistRow {
  email: string;
  role: string;
  source: string;
  createdAt: Date;
  confirmedAt: Date | null;
  confirmSentAt: Date | null;
}

export interface WaitlistStore {
  /** Creates the signup if the email is new; returns the stored row either way. */
  upsert(email: string, role: WaitlistRole, source: string): Promise<WaitlistRow>;
  markConfirmSent(email: string, at: Date): Promise<void>;
  /** False when there is no such signup. */
  confirm(email: string, at: Date): Promise<boolean>;
  /** Deletes the signup. False when there was none. */
  remove(email: string): Promise<boolean>;
  all(): Promise<WaitlistRow[]>;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  headers: Record<string, string>;
}
export type SendMail = (m: MailMessage) => Promise<void>;

export interface WaitlistConfig {
  /** Public website URL, for links in emails. */
  appUrl: string;
  /** Public API URL, for the one-click unsubscribe header. */
  apiUrl: string;
  /** Signs confirm and unsubscribe links. */
  secret: string;
  /** Enables the admin export when set (at least 24 characters). */
  adminToken?: string;
  perMinute?: number;
  /** Minimum time between two confirmation emails to the same address. */
  resendAfterMs?: number;
}

// ---------- signed links ----------

const b64url = (b: Buffer) => b.toString('base64url');
export const encodeEmail = (email: string) => b64url(Buffer.from(email, 'utf8'));
export const decodeEmail = (e: string) => Buffer.from(e, 'base64url').toString('utf8');

export function linkToken(secret: string, purpose: 'confirm' | 'unsub', email: string): string {
  return b64url(createHmac('sha256', secret).update(`${purpose}:${email}`).digest());
}

export function checkToken(
  secret: string,
  purpose: 'confirm' | 'unsub',
  email: string,
  token: string,
): boolean {
  const want = Buffer.from(linkToken(secret, purpose, email));
  const got = Buffer.from(token);
  return got.length === want.length && timingSafeEqual(got, want);
}

export function waitlistLinks(cfg: WaitlistConfig, email: string) {
  const e = encodeEmail(email);
  const confirm = linkToken(cfg.secret, 'confirm', email);
  const unsub = linkToken(cfg.secret, 'unsub', email);
  return {
    confirm: `${cfg.appUrl}/waitlist/confirm?e=${e}&t=${confirm}`,
    unsubscribe: `${cfg.appUrl}/waitlist/unsubscribe?e=${e}&t=${unsub}`,
    oneClick: `${cfg.apiUrl}/v1/waitlist/unsubscribe?e=${e}&t=${unsub}`,
  };
}

export function confirmationEmail(cfg: WaitlistConfig, email: string): MailMessage {
  const l = waitlistLinks(cfg, email);
  const text = [
    'Hi,',
    '',
    'Confirm your email to join the Blackbox waitlist:',
    l.confirm,
    '',
    'We’ll email you once, on the day Blackbox opens. If you didn’t sign up, ignore this email and nothing happens.',
    '',
    `Remove my email: ${l.unsubscribe}`,
    '',
    'Blackbox, the flight recorder for AI trading agents',
  ].join('\n');
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.6;color:#111">
<p>Hi,</p>
<p>Confirm your email to join the Blackbox waitlist.</p>
<p><a href="${l.confirm}" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#FF6A1F;color:#1A0A00;text-decoration:none;font-weight:600">Confirm my email</a></p>
<p>We’ll email you once, on the day Blackbox opens. If you didn’t sign up, ignore this email and nothing happens.</p>
<p style="color:#666;font-size:13px"><a href="${l.unsubscribe}" style="color:#666">Remove my email</a> · Blackbox, the flight recorder for AI trading agents</p>
</div>`;
  return {
    to: email,
    subject: 'Confirm your spot on the Blackbox waitlist',
    text,
    html,
    headers: { 'List-Unsubscribe': `<${l.oneClick}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
}

// ---------- CSV ----------

/** Quotes a cell and defuses spreadsheet formulas (cells starting with = + - @). */
export function csvCell(v: unknown): string {
  let s = v instanceof Date ? v.toISOString() : v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(rows: WaitlistRow[]): string {
  const head = ['email', 'role', 'source', 'created_at', 'confirmed_at'];
  const lines = rows.map((r) =>
    [r.email, r.role, r.source, r.createdAt, r.confirmedAt].map(csvCell).join(','),
  );
  return [head.join(','), ...lines].join('\r\n') + '\r\n';
}

// ---------- in-memory store (tests, local runs without a database) ----------

export function createMemoryWaitlistStore(): WaitlistStore {
  const rows = new Map<string, WaitlistRow>();
  return {
    async upsert(email, role, source) {
      const existing = rows.get(email);
      if (existing) return existing;
      const row = { email, role, source, createdAt: new Date(), confirmedAt: null, confirmSentAt: null };
      rows.set(email, row);
      return row;
    },
    async markConfirmSent(email, at) {
      const r = rows.get(email);
      if (r) r.confirmSentAt = at;
    },
    async confirm(email, at) {
      const r = rows.get(email);
      if (!r) return false;
      r.confirmedAt ??= at;
      return true;
    },
    async remove(email) {
      return rows.delete(email);
    },
    async all() {
      return [...rows.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
  };
}

// ---------- routes ----------

const SignupBody = z.object({
  email: z.string().trim().toLowerCase().max(254).email(),
  role: z.enum(['owner', 'builder', 'curious']),
  source: z
    .string()
    .trim()
    .max(40)
    .regex(/^[a-z0-9-]*$/)
    .default('site'),
  /** Honeypot: hidden from people, filled in by bots. */
  website: z.string().max(200).optional(),
});
const LinkBody = z.object({ e: z.string().min(1).max(400), t: z.string().min(1).max(100) });

const err = (code: string, message: string) => ({ error: { code, message } });

export function registerWaitlist(
  app: FastifyInstance,
  deps: { store: WaitlistStore; sendMail: SendMail | null; now?: () => Date },
  cfg: WaitlistConfig,
) {
  const now = deps.now ?? (() => new Date());
  const resendAfter = cfg.resendAfterMs ?? 10 * 60_000;
  const limit = { rateLimit: { max: cfg.perMinute ?? 5, timeWindow: '1 minute' } };

  // One-click unsubscribe (RFC 8058) posts a form body.
  app.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, (_req, body, done) =>
    done(null, Object.fromEntries(new URLSearchParams(body as string))),
  );

  const linkEmail = (purpose: 'confirm' | 'unsub', input: unknown): string | null => {
    const parsed = LinkBody.safeParse(input);
    if (!parsed.success) return null;
    let email: string;
    try {
      email = decodeEmail(parsed.data.e);
    } catch {
      return null;
    }
    return checkToken(cfg.secret, purpose, email, parsed.data.t) ? email : null;
  };

  app.post('/v1/waitlist', { config: limit }, async (req, reply) => {
    const parsed = SignupBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      const emailIssue = parsed.error.issues.some((i) => i.path[0] === 'email');
      return reply
        .code(400)
        .send(
          err('invalid_body', emailIssue ? 'Enter a valid email address.' : 'Pick what brings you here.'),
        );
    }
    const { email, role, source, website } = parsed.data;
    const answer = { ok: true, confirm: !!deps.sendMail };
    if (website) return reply.code(201).send(answer); // a bot filled the honeypot: pretend it worked

    const row = await deps.store.upsert(email, role, source || 'site');
    const recentlySent = row.confirmSentAt && now().getTime() - row.confirmSentAt.getTime() < resendAfter;
    if (deps.sendMail && !row.confirmedAt && !recentlySent) {
      try {
        await deps.sendMail(confirmationEmail(cfg, email));
        await deps.store.markConfirmSent(email, now());
      } catch (e) {
        req.log.error({ err: e }, 'waitlist confirmation email failed');
      }
    }
    return reply.code(201).send(answer);
  });

  app.post('/v1/waitlist/confirm', { config: limit }, async (req, reply) => {
    const email = linkEmail('confirm', req.body);
    if (!email || !(await deps.store.confirm(email, now()))) {
      return reply
        .code(400)
        .send(err('invalid_link', 'This link doesn’t work anymore. Sign up again to get a new one.'));
    }
    return { ok: true };
  });

  // Accepts the link's e and t in the JSON body (our page) or the query string (one-click from mail apps).
  app.post('/v1/waitlist/unsubscribe', { config: limit }, async (req, reply) => {
    const q = req.query as Record<string, string>;
    const email = linkEmail('unsub', q.e && q.t ? q : req.body);
    if (!email)
      return reply
        .code(400)
        .send(err('invalid_link', 'This link doesn’t work. Copy the full link from the email.'));
    await deps.store.remove(email);
    return { ok: true };
  });

  const adminEnabled = !!cfg.adminToken && cfg.adminToken.length >= 24;
  app.get(
    '/v1/admin/waitlist',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (req, reply) => {
      if (!adminEnabled) return reply.code(404).send(err('not_found', 'No route for GET /v1/admin/waitlist'));
      const given = Buffer.from((req.headers.authorization ?? '').replace(/^Bearer\s+/i, ''));
      const want = Buffer.from(cfg.adminToken!);
      if (given.length !== want.length || !timingSafeEqual(given, want)) {
        return reply.code(401).send(err('unauthorized', 'Wrong admin token.'));
      }
      const rows = await deps.store.all();
      reply.header('cache-control', 'no-store');
      if ((req.query as Record<string, string>).format === 'csv') {
        return reply
          .header('content-type', 'text/csv; charset=utf-8')
          .header(
            'content-disposition',
            `attachment; filename="blackbox-waitlist-${now().toISOString().slice(0, 10)}.csv"`,
          )
          .send(toCsv(rows));
      }
      const count = (key: 'role' | 'source') =>
        Object.fromEntries(
          Object.entries(
            rows.reduce<Record<string, number>>((m, r) => ((m[r[key]] = (m[r[key]] ?? 0) + 1), m), {}),
          ).sort((a, b) => b[1] - a[1]),
        );
      return {
        total: rows.length,
        confirmed: rows.filter((r) => r.confirmedAt).length,
        emailConfirmation: !!deps.sendMail,
        byRole: count('role'),
        bySource: count('source'),
        items: rows.slice(0, 200).map((r) => ({
          email: r.email,
          role: r.role,
          source: r.source,
          createdAt: r.createdAt.toISOString(),
          confirmedAt: r.confirmedAt?.toISOString() ?? null,
        })),
      };
    },
  );
}
