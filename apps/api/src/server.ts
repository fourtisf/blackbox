import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { buildApp } from './app.js';
import { loadEnv } from './env.js';
import { createMailer } from './mailer.js';
import { prismaWaitlistStore } from './waitlist-store.js';

const env = loadEnv();
const prisma = new PrismaClient({ datasourceUrl: env.databaseUrl });
const redis = new Redis(env.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });

const app = buildApp(
  {
    pingDb: async () => {
      await prisma.$queryRaw`SELECT 1`;
    },
    pingRedis: async () => {
      if (redis.status === 'wait') await redis.connect();
      await redis.ping();
    },
    waitlist: prismaWaitlistStore(prisma),
    sendMail: createMailer(env.smtpUrl, env.mailFrom),
  },
  {
    logger: { level: env.nodeEnv === 'production' ? 'info' : 'debug' },
    // Behind Nginx on the same host: take the client IP from X-Forwarded-For, but only from a local proxy.
    trustProxy: 'loopback',
    corsOrigins: env.corsOrigins,
    waitlist: {
      appUrl: env.appUrl,
      apiUrl: env.apiUrl,
      secret: env.waitlistSecret,
      ...(env.adminToken ? { adminToken: env.adminToken } : {}),
    },
  },
);

const shutdown = async (signal: string) => {
  app.log.info(`${signal}: shutting down`);
  await app.close();
  await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

await app.listen({ host: env.host, port: env.port });
