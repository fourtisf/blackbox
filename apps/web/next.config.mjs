import nextEnv from '@next/env';
import { fileURLToPath } from 'node:url';

// One .env at the repo root serves every app.
nextEnv.loadEnvConfig(fileURLToPath(new URL('../..', import.meta.url)));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Linting runs from the repo root (pnpm lint), not inside next build.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
