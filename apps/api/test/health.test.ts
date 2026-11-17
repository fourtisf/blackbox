import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import type { Deps } from '../src/app.js';

const up = async () => {};
const down = async () => {
  throw new Error('connection refused');
};
const hang = () => new Promise<void>(() => {});
const app = (deps: Partial<Deps> = {}) => buildApp({ pingDb: up, pingRedis: up, addToWaitlist: up, ...deps });

describe('GET /v1/health', () => {
  it('is 200 when the database and Redis answer', async () => {
    const res = await app().inject('/v1/health');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, db: 'ok', redis: 'ok', protocolVersion: 1 });
  });

  it('is 503 and names the failing dependency', async () => {
    const db = await app({ pingDb: down }).inject('/v1/health');
    expect(db.statusCode).toBe(503);
    expect(db.json()).toMatchObject({ ok: false, db: 'down', redis: 'ok' });
    const redis = await app({ pingRedis: down }).inject('/v1/health');
    expect(redis.json()).toMatchObject({ ok: false, db: 'ok', redis: 'down' });
  });

  it('times out a dependency that hangs instead of hanging itself', async () => {
    const res = await app({ pingRedis: hang }).inject('/v1/health');
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ redis: 'down' });
  }, 5000);
});

describe('errors use the { error: { code, message } } shape', () => {
  it('unknown routes are 404 not_found', async () => {
    const res = await app().inject('/v1/nope');
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: { code: 'not_found', message: 'No route for GET /v1/nope' } });
  });

  it('thrown errors are 500 internal without leaking details', async () => {
    const a = app();
    a.get('/boom', async () => {
      throw new Error('secret stack detail');
    });
    const res = await a.inject('/boom');
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: { code: 'internal', message: 'Something went wrong on our side.' } });
  });

  it('client errors keep their status and message', async () => {
    const a = app();
    a.post('/echo', async (req) => req.body);
    const res = await a.inject({
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'application/json' },
      payload: '{bad',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: { code: 'bad_request', message: expect.stringMatching(/json/i) } });
  });
});
