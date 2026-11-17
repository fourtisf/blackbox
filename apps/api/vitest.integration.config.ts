import { defineConfig } from 'vitest/config';

// Needs Postgres and Redis (pnpm db:up) with migrations applied (pnpm --filter api prisma migrate dev).
export default defineConfig({
  test: { include: ['test/**/*.integration.test.ts'] },
});
