# 09: Roadmap

Each milestone ends with: lint, typecheck and tests green; a short report (what works, how to run it, decisions made); then stop for review.

## Milestone 1: Foundation and protocol

- [x] pnpm + Turborepo monorepo with `apps/web`, `apps/api`, `apps/indexer`, `packages/protocol`, `packages/recorder`, `packages/contracts`; shared tsconfig, ESLint, Prettier, Vitest.
- [x] `packages/protocol`: RFC 8785 canonical JSON (with RFC test vectors), `recordHash`, `leaf`, sorted-pair Merkle tree + proofs, `verify()` returning typed checks. Works in Node and browser. `PROTOCOL_VERSION = 1`.
- [x] Golden test vectors file `packages/protocol/vectors.json` (record → recordHash → leaf → root) used by every package's tests.
- [x] `packages/contracts`: AgentRegistry + SealRegistry from the drafts, full Foundry tests, gas report, deploy script. Deploy to a local anvil chain.
- [x] Docker Compose for local Postgres + Redis. Prisma schema migrated.

Done when: `pnpm test` passes, including protocol vectors and `forge test`; contracts deploy to anvil with one command.

## Milestone 2: Website on mock API (pixel match)

- [x] Next.js app with the design tokens, Geist fonts, noise and glow background.
- [x] Every page from the prototype built as components: landing (all sections), leaderboard, agent profile with replay and chart, verify. Plus `/connect` using the same components.
- [x] A mock data layer that mirrors the API response shapes in `05-API.md` (port the prototype's generator), switchable by env to the real API later.
- [x] Rewrite demo uses real `packages/protocol` hashing.
- [x] Visual check: screenshots of each page at 1440 and 390 next to the prototype; fix differences.

Also built (approved after review): demo labels, waitlist (web + `POST /v1/waitlist`), docs with security and trust score, FAQ, draft legal pages, owner dashboard, mobile menu, injected-wallet connection, every record state (private, late seal, no reasoning, recorder offline, sequence gaps, new and unranked agents), trust score column, explorer links, loading and error states, pagination, SVG badge, social preview images, robots and sitemap.

Done when: side-by-side screenshots match the prototype; Lighthouse desktop performance ≥ 85, accessibility ≥ 95.
Result: landing, leaderboard, verify and docs score 100 on performance, accessibility, best practices and SEO; agent pages 100 / 97 / 100 (SEO is intentionally blocked for demo agent pages).

## Milestone 3: Recorder

- [ ] CLI commands from `03-RECORDER.md`: `init`, `status`, `wrap`, `mode`, `reveal`, `uninstall`.
- [ ] Config detection and safe rewrite for Claude Code, Codex, OpenClaw, Hermes (verify current formats first), with backups and exact restore.
- [ ] MCP proxy over stdio and remote HTTP; Blackbox tools `record_decision`, `record_pass`, `blackbox_status`; skill/instruction install.
- [ ] Seal-before-forward flow, strict and lenient modes, retry queue, local SQLite store, keychain sealer key.
- [ ] Tests with a fake trading MCP server against anvil.

Done when: on anvil, a scripted agent records a decision, the proxy seals it, the fake trade lands in a later block, and `verify()` passes on the result.

## Milestone 4: API + indexer on testnet

- [ ] Deploy contracts to Robinhood Chain testnet (after confirming official parameters).
- [ ] Indexer streams: registry, seals, wallet transfers and swaps, prices, metrics (formulas in `06-DATA-AND-METRICS.md`), live feed via Redis.
- [ ] API routes from `05-API.md` (public, recorder, owner). SIWE auth. Relayed seals. Reveal verification.
- [ ] Switch the website from mock to the real API. `/connect` registers agents on testnet.
- [ ] `blackbox ui` local replay dashboard.

Done when: an agent on testnet goes through init → connect → trades → appears on the leaderboard with correct metrics, and any of its hashes verifies on `/verify` with the browser RPC re-check.

## Milestone 5: Alerts, hardening, VPS

- [ ] Telegram bot: link flow, loop / spend spike / silence alerts, ops alerts (indexer lag, relayer balance).
- [ ] Rate limits, input fuzzing on recorder routes, reorg handling tests, Sentry or equivalent error tracking.
- [ ] Deploy to the Hostinger VPS with PM2 + Nginx + TLS on testnet config.
- [ ] Publish the recorder to npm (beta tag).

Done when: the full flow works on the VPS against testnet for 48 hours without manual fixes.

## Milestone 6: Mainnet beta (needs ALFA's approval)

- [ ] Contract review, mainnet deploy, address publication.
- [ ] Partner trust API with keys.
- [ ] Leaderboard eligibility rules live; trust score v1 published on the site.

## Later

Paid plans and USDG payments, $BOX token and fee buyback, copy-trading, Solana, Hyperliquid, CEX read-only import, competition seasons.
