import { z } from 'zod';

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  API_HOST: z.string().default('127.0.0.1'),
  // PM2 (infra/ecosystem.config.js) sets PORT; local .env sets API_PORT.
  API_PORT: z.coerce.number().int().positive().optional(),
  PORT: z.coerce.number().int().positive().optional(),
  APP_URL: z.string().url().default('http://localhost:3000'),
  // Extra browser origins allowed by CORS, comma separated (e.g. a staging site).
  CORS_ORIGINS: z.string().optional(),
  // Public URL of this API, for links in emails.
  API_URL: z.string().url().default('http://localhost:4000'),
  // Signs waitlist confirm/unsubscribe links. Required in production.
  WAITLIST_SECRET: z.string().optional(),
  // Enables GET /v1/admin/waitlist (Bearer token, at least 24 characters).
  ADMIN_TOKEN: z.string().optional(),
  // Confirmation emails: smtp:// or smtps:// URL. Unset = no emails, signups are stored unconfirmed.
  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().default('Blackbox <hello@localhost>'),
});

export interface ApiEnv {
  nodeEnv: 'development' | 'test' | 'production';
  databaseUrl: string;
  redisUrl: string;
  host: string;
  port: number;
  corsOrigins: string[];
  appUrl: string;
  apiUrl: string;
  waitlistSecret: string;
  adminToken: string | undefined;
  smtpUrl: string | undefined;
  mailFrom: string;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const parsed = Env.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid API environment (${issues}). Copy .env.example to .env at the repo root.`);
  }
  const e = parsed.data;
  const secret = e.WAITLIST_SECRET ?? '';
  if (e.NODE_ENV === 'production' && secret.length < 32) {
    throw new Error('Set WAITLIST_SECRET to at least 32 random characters (openssl rand -hex 32).');
  }
  if (e.ADMIN_TOKEN && e.ADMIN_TOKEN.length < 24)
    throw new Error('ADMIN_TOKEN must be at least 24 characters.');
  return {
    nodeEnv: e.NODE_ENV,
    databaseUrl: e.DATABASE_URL,
    redisUrl: e.REDIS_URL,
    host: e.API_HOST,
    port: e.API_PORT ?? e.PORT ?? 4000,
    corsOrigins: [e.APP_URL, ...(e.CORS_ORIGINS ?? '').split(',')]
      .map((o) => o.trim().replace(/\/$/, ''))
      .filter(Boolean),
    appUrl: e.APP_URL.replace(/\/$/, ''),
    apiUrl: e.API_URL.replace(/\/$/, ''),
    waitlistSecret: secret || 'dev-only-waitlist-secret',
    adminToken: e.ADMIN_TOKEN || undefined,
    smtpUrl: e.SMTP_URL || undefined,
    mailFrom: e.MAIL_FROM,
  };
}
