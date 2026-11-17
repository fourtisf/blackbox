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
});

export interface ApiEnv {
  nodeEnv: 'development' | 'test' | 'production';
  databaseUrl: string;
  redisUrl: string;
  host: string;
  port: number;
  corsOrigins: string[];
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const parsed = Env.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid API environment (${issues}). Copy .env.example to .env at the repo root.`);
  }
  const e = parsed.data;
  return {
    nodeEnv: e.NODE_ENV,
    databaseUrl: e.DATABASE_URL,
    redisUrl: e.REDIS_URL,
    host: e.API_HOST,
    port: e.API_PORT ?? e.PORT ?? 4000,
    corsOrigins: [e.APP_URL, ...(e.CORS_ORIGINS ?? '').split(',')]
      .map((o) => o.trim().replace(/\/$/, ''))
      .filter(Boolean),
  };
}
