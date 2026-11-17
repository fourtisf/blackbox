import { PROTOCOL_VERSION } from '@blackbox/protocol';
import Fastify from 'fastify';
import type { FastifyInstance, FastifyServerOptions } from 'fastify';

/** What the app needs from the outside world; real clients in server.ts, fakes in tests. */
export interface Deps {
  pingDb(): Promise<void>;
  pingRedis(): Promise<void>;
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

export function buildApp(deps: Deps, opts: FastifyServerOptions = {}): FastifyInstance {
  const app = Fastify(opts);

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
