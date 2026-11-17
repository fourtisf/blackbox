/**
 * Site configuration from NEXT_PUBLIC_* variables (root .env, inlined at build time).
 *
 * NEXT_PUBLIC_DATA_SOURCE=mock (default) serves curated demo data from /mock-api, labeled as a demo
 * everywhere. Set it to `api` once the real API runs (Milestone 4).
 */
export type DataSource = 'mock' | 'api';

export const DATA_SOURCE: DataSource = process.env.NEXT_PUBLIC_DATA_SOURCE === 'api' ? 'api' : 'mock';
export const IS_DEMO = DATA_SOURCE === 'mock';

/** The real Blackbox API (also used for the waitlist, which always needs a real backend). */
export const PUBLIC_API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
/** Base URL the browser uses for read data: the mock route handlers in demo mode. */
export const DATA_API_BASE = IS_DEMO ? '/mock-api' : PUBLIC_API_URL;

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/** Explorer links only make sense for real chain data. */
export const EXPLORER_URL = IS_DEMO ? '' : (process.env.NEXT_PUBLIC_EXPLORER_URL ?? '').replace(/\/$/, '');
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 31337);
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? '';

/**
 * The recorder's npm name is undecided (docs/10-DECISIONS.md #2). Until it is published,
 * install buttons open the waitlist instead of copying a command nobody can run yet.
 */
export const RECORDER_PACKAGE = process.env.NEXT_PUBLIC_RECORDER_PACKAGE ?? '@blackbox-rec/cli';
export const RECORDER_PUBLISHED = process.env.NEXT_PUBLIC_RECORDER_PUBLISHED === 'true';
export const INSTALL_COMMAND = `npx ${RECORDER_PACKAGE} init`;

/** Community links render only when set. */
export const SOCIAL = {
  x: process.env.NEXT_PUBLIC_X_URL ?? '',
  telegram: process.env.NEXT_PUBLIC_TELEGRAM_URL ?? '',
  github: process.env.NEXT_PUBLIC_GITHUB_URL ?? '',
};

/** Shown on /about and in security.txt; each appears only when set. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '';
export const SECURITY_CONTACT = process.env.NEXT_PUBLIC_SECURITY_CONTACT ?? '';
