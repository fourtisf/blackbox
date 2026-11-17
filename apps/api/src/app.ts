import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { PROTOCOL_VERSION } from '@blackbox/protocol';
import Fastify from 'fastify';
import type { FastifyInstance, FastifyServerOptions } from 'fastify';
import { registerWaitlist } from './waitlist.js';
import type { SendMail, WaitlistConfig, WaitlistStore } from './waitlist.js';

/** What the app needs from the outside world; real clients in server.ts, fakes in tests. */
export interface Deps {
  pingDb(): Promise<void>;
  pingRedis(): Promise<void>;
  waitlist: WaitlistStore;
  /** null when no SMTP server is configured: signups are stored without a confirmation email. */
  sendMail: SendMail | null;
  now?: () => Date;
}

export interface AppOptions extends FastifyServerOptions {
  /** Browser origins allowed to call the API (the website). */
  corsOrigins?: string[];
  waitlist?: Partial<WaitlistConfig>;
}

export interface ApiError {
  error: { code: string; message: string };
}

const HEALTH_TIMEOUT_MS = 2000;

async function probe(fn: () => Promise<void>): Promise<'ok' | 'down'> {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      fn(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), HEALTH_TIMEOUT_MS);
      }),
    ]);
    return 'ok';
  } catch {
    return 'down';
  } finally {
    clearTimeout(timer);
  }
}

export function buildApp(deps: Deps, opts: AppOptions = {}): FastifyInstance {
  const { corsOrigins = ['http://localhost:3000'], waitlist = {}, ...fastifyOpts } = opts;
  const app = Fastify(fastifyOpts);
  void app.register(cors, { origin: corsOrigins, methods: ['GET', 'POST', 'PATCH'] });
  void app.register(rateLimit, {
    global: false,
    errorResponseBuilder: () => ({
      statusCode: 429,
      code: 'rate_limited',
      message: 'Too many requests. Try again in a minute.',
    }),
  });

  app.register(async (scope) =>
    registerWaitlist(
      scope,
      { store: deps.waitlist, sendMail: deps.sendMail, ...(deps.now ? { now: deps.now } : {}) },
      {
        appUrl: corsOrigins[0] ?? 'http://localhost:3000',
        apiUrl: 'http://localhost:4000',
        secret: 'dev-only-waitlist-secret',
        ...waitlist,
      },
    ),
  );

  app.get('/v1/health', async (_req, reply) => {
    const [db, redis] = await Promise.all([probe(deps.pingDb), probe(deps.pingRedis)]);
    const ok = db === 'ok' && redis === 'ok';
    return reply.code(ok ? 200 : 503).send({ ok, db, redis, protocolVersion: PROTOCOL_VERSION });
  });

  app.setNotFoundHandler((req, reply) => {
    const body: ApiError = { error: { code: 'not_found', message: `No route for ${req.method} ${req.url}` } };
    return reply.code(404).send(body);
  });

  app.setErrorHandler((err: { statusCode?: number; code?: string; message: string }, req, reply) => {
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    if (status >= 500) req.log.error(err);
    const body: ApiError = {
      error: {
        code: err.code?.toLowerCase() ?? (status >= 500 ? 'internal' : 'bad_request'),
        message: status >= 500 ? 'Something went wrong on our side.' : err.message,
      },
    };
    return reply.code(status).send(body);
  });

  return app;
}
