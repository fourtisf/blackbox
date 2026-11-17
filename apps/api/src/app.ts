import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { PROTOCOL_VERSION } from '@blackbox/protocol';
import Fastify from 'fastify';
import type { FastifyInstance, FastifyServerOptions } from 'fastify';
import { z } from 'zod';

export type WaitlistRole = 'owner' | 'builder' | 'curious';

/** What the app needs from the outside world; real clients in server.ts, fakes in tests. */
export interface Deps {
  pingDb(): Promise<void>;
  pingRedis(): Promise<void>;
  /** Stores a signup; adding an email twice is not an error. */
  addToWaitlist(email: string, role: WaitlistRole, source: string): Promise<void>;
}

export interface AppOptions extends FastifyServerOptions {
  /** Browser origins allowed to call the API (the website). */
  corsOrigins?: string[];
  /** Waitlist signups allowed per IP per minute. */
  waitlistPerMinute?: number;
}

const WaitlistBody = z.object({
  email: z.string().trim().toLowerCase().max(254).email(),
  role: z.enum(['owner', 'builder', 'curious']),
  source: z
    .string()
    .trim()
    .max(40)
    .regex(/^[a-z0-9-]*$/)
    .default('site'),
});

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
  const { corsOrigins = ['http://localhost:3000'], waitlistPerMinute = 5, ...fastifyOpts } = opts;
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

  app.register(async (scope) => {
    scope.post(
      '/v1/waitlist',
      { config: { rateLimit: { max: waitlistPerMinute, timeWindow: '1 minute' } } },
      async (req, reply) => {
        const parsed = WaitlistBody.safeParse(req.body ?? {});
        if (!parsed.success) {
          const emailIssue = parsed.error.issues.some((i) => i.path[0] === 'email');
          const body: ApiError = {
            error: {
              code: 'invalid_body',
              message: emailIssue ? 'Enter a valid email address.' : 'Pick what brings you here.',
            },
          };
          return reply.code(400).send(body);
        }
        const { email, role, source } = parsed.data;
        await deps.addToWaitlist(email, role, source || 'site');
        // Same answer for new and existing emails, so the endpoint never reveals who signed up.
        return reply.code(201).send({ ok: true });
      },
    );
  });

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
