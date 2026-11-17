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
    });
    const res = await app.inject('/v1/health');
    expect(res.json()).toMatchObject({ ok: true, db: 'ok', redis: 'ok' });
  });

  it('the migrated schema accepts an indexer cursor', async () => {
    const stream = `test-${Date.now()}`;
    await prisma.indexerCursor.create({ data: { stream, block: 115_042_000n } });
    const row = await prisma.indexerCursor.findUniqueOrThrow({ where: { stream } });
    expect(row.block).toBe(115_042_000n);
    await prisma.indexerCursor.delete({ where: { stream } });
  });
});
