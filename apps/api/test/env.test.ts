import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/env.js';

const base = { DATABASE_URL: 'postgresql://u:p@127.0.0.1:5432/db', REDIS_URL: 'redis://127.0.0.1:6379' };

describe('loadEnv', () => {
  it('applies defaults', () => {
    expect(loadEnv(base)).toEqual({
      nodeEnv: 'development',
      databaseUrl: base.DATABASE_URL,
      redisUrl: base.REDIS_URL,
      host: '127.0.0.1',
      port: 4000,
      corsOrigins: ['http://localhost:3000'],
      appUrl: 'http://localhost:3000',
      apiUrl: 'http://localhost:4000',
      waitlistSecret: 'dev-only-waitlist-secret',
      adminToken: undefined,
      smtpUrl: undefined,
      mailFrom: 'Blackbox <hello@localhost>',
    });
  });
  it('prefers API_PORT, then PORT (set by PM2)', () => {
    expect(loadEnv({ ...base, PORT: '5000' }).port).toBe(5000);
    expect(loadEnv({ ...base, PORT: '5000', API_PORT: '4100' }).port).toBe(4100);
  });
  it('allows the site origin plus any extra CORS origins', () => {
    expect(
      loadEnv({
        ...base,
        APP_URL: 'https://blackbox.example/',
        CORS_ORIGINS: 'https://staging.blackbox.example, ',
      }).corsOrigins,
    ).toEqual(['https://blackbox.example', 'https://staging.blackbox.example']);
  });
  it('refuses to run in production without a real waitlist secret, and rejects short admin tokens', () => {
    expect(() => loadEnv({ ...base, NODE_ENV: 'production' })).toThrow(/WAITLIST_SECRET/);
    expect(loadEnv({ ...base, NODE_ENV: 'production', WAITLIST_SECRET: 'x'.repeat(32) }).waitlistSecret).toBe(
      'x'.repeat(32),
    );
    expect(() => loadEnv({ ...base, ADMIN_TOKEN: 'short' })).toThrow(/ADMIN_TOKEN/);
  });
  it('explains what is missing', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL.*REDIS_URL|REDIS_URL.*DATABASE_URL/);
  });
});
