import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadEnv } from '../src/env.js';
import { prismaWaitlistStore } from '../src/waitlist-store.js';

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
      waitlist: prismaWaitlistStore(prisma),
      sendMail: null,
    });
    const res = await app.inject('/v1/health');
    expect(res.json()).toMatchObject({ ok: true, db: 'ok', redis: 'ok' });
  });

  it('waitlist store: one row per email, confirm, then delete', async () => {
    const store = prismaWaitlistStore(prisma);
    const email = `it-${Date.now()}@example.com`;
    await store.upsert(email, 'owner', 'test');
    const again = await store.upsert(email, 'builder', 'test');
    expect(again.role).toBe('owner');
    expect(await store.confirm(email, new Date())).toBe(true);
    expect((await store.all()).find((r) => r.email === email)?.confirmedAt).toBeInstanceOf(Date);
    expect(await store.remove(email)).toBe(true);
    expect(await store.remove(email)).toBe(false);
    expect(await store.confirm(email, new Date())).toBe(false);
  });

  it('the migrated schema accepts an indexer cursor', async () => {
    const stream = `test-${Date.now()}`;
    await prisma.indexerCursor.create({ data: { stream, block: 115_042_000n } });
    const row = await prisma.indexerCursor.findUniqueOrThrow({ where: { stream } });
    expect(row.block).toBe(115_042_000n);
    await prisma.indexerCursor.delete({ where: { stream } });
  });
});
