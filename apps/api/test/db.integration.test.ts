import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadEnv } from '../src/env.js';

const env = loadEnv();
const prisma = new PrismaClient({ datasourceUrl: env.databaseUrl });
const redis = new Redis(env.redisUrl, { maxRetriesPerRequest: 1 });
afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe('against real Postgres and Redis', () => {
  it('health is ok', async () => {
    const app = buildApp({
      pingDb: async () => void (await prisma.$queryRaw`SELECT 1`),
      pingRedis: async () => void (await redis.ping()),
      addToWaitlist: async () => {},
    });
    const res = await app.inject('/v1/health');
    expect(res.json()).toMatchObject({ ok: true, db: 'ok', redis: 'ok' });
  });

  it('waitlist signups are stored once per email', async () => {
    const email = `it-${Date.now()}@example.com`;
    const add = (role: string) =>
      prisma.waitlistSignup.upsert({ where: { email }, create: { email, role, source: 'test' }, update: {} });
    await add('owner');
    await add('builder');
    const rows = await prisma.waitlistSignup.findMany({ where: { email } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.role).toBe('owner');
    await prisma.waitlistSignup.delete({ where: { email } });
  });

  it('the migrated schema accepts an indexer cursor', async () => {
    const stream = `test-${Date.now()}`;
    await prisma.indexerCursor.create({ data: { stream, block: 115_042_000n } });
    const row = await prisma.indexerCursor.findUniqueOrThrow({ where: { stream } });
    expect(row.block).toBe(115_042_000n);
    await prisma.indexerCursor.delete({ where: { stream } });
  });
});
