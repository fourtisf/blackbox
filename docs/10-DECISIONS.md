# 10: Decisions and open questions

Defaults below let the build continue. ALFA can change any of them; the ones marked **ALFA** need an answer before mainnet.

| # | Topic | Default used now | Status |
|---|---|---|---|
| 1 | Product name and domain | "Blackbox" is a working name; domain TBD | **ALFA** |
| 2 | npm package name for the CLI | `@blackbox-rec/cli` placeholder; check availability of a short name | **ALFA** |
| 3 | Who pays gas for seals | Relayer sponsors seals during beta (`sealBySig`); self-paid mode also supported | **ALFA** (budget) |
| 4 | Default reveal policy | `delayed`, 24 h after the decision and after the position closes | Default OK unless changed |
| 5 | Default enforcement mode | `lenient` (never blocks a trade; unsealed trades lower coverage). `strict` is opt-in | Default OK unless changed |
| 6 | Pricing | Beta is free. Prototype prices (Verified $0.40/day, Pro $24/month, API $0.01/check) are placeholders shown on the site | **ALFA** |
| 7 | $BOX token | Not built. The $BOX section stays static with "Contract address is published at launch." Fee buyback percentages on the site are placeholders | **ALFA** |
| 8 | Leaderboard eligibility | Age ≥ 7 days, ≥ 5 trades in period, seal coverage ≥ 80% | Default OK unless changed |
| 9 | Trust score formula | v1 formula in `06-DATA-AND-METRICS.md`, published openly | Default OK unless changed |
| 10 | Price source | Uniswap v4 pools against USDG on Robinhood Chain; fall back to last trade price and flag | Verify pools exist for the stock tokens |
| 11 | Tokenized stock token list | Pull from the official Robinhood Chain list; never guess addresses | Needs source |
| 12 | Wallet connection | wagmi + viem, injected wallets + WalletConnect | Default OK |
| 13 | Integrations shown on the site | "Claude Code, Codex, OpenClaw, Hermes, Any MCP client" as text only, no logos. Named trading kits (Rushr, Hedgehood, Oak, QHooks) only in docs and server profiles, not as partners on the site | Ask before claiming any partnership |
| 14 | Agent names on the landing page | Real top agents from the API. Until there are real agents, keep the landing page on curated demo data clearly labeled as a demo | **ALFA** |
| 15 | Analytics | Plausible or Umami (self-hosted, no cookies) | Default OK |

## Assumptions to confirm early

- Robinhood Chain mainnet chain ID 4663 and the RPC/explorer URLs listed in `CLAUDE.md`.
- Block time short enough that seal-then-release adds well under 2 s.
- Agent kits expose trade results that include the tx hash (needed for fast linking; the indexer still links without it).

## Decided in Milestone 1

Approved before the build (protocol changes 1 to 3), or chosen during it where the docs were silent.

| # | Topic | Decision |
|---|---|---|
| M1-1 | Tool-call hashes | `toolHash = keccak256(0x02 \|\| salt \|\| JCS(value))` with a separate random salt per args object and per result, so revealing a record never exposes guessable tool arguments. Plaintext of a single call can be revealed with its salt. (`02-ARCHITECTURE.md` §3a) |
| M1-2 | Auto-captured trades | Records carry `autoCaptured`. Auto-captured trades (lenient mode, no `record_decision`) have empty reasoning, fail the `reasoning_recorded` check and count as unsealed in seal coverage. |
| M1-3 | Agent id | Derived on chain in `register(salt, …)` from `msg.sender`, so ids cannot be front-run. |
| M1-4 | SealRegistry owner | None. `sealBySig` accepts a valid signature from any sender, so there is no relayer address to manage. |
| M1-5 | Record validation | Strict: exact field set, lowercase hex and addresses, integer-string amounts, safe-integer `seq`/`ts`. Invalid records cannot be hashed. |
| M1-6 | Zod location | Not in `packages/protocol` (it may only depend on `@noble/hashes`). The API defines Zod schemas against the protocol's types. |
| M1-7 | Tool versions | TypeScript 5.9 (typescript-eslint does not support 7 yet), ESLint 10, Vitest 4, Turborepo 2, Prisma 6.19 (latest 6.x; 7 is a breaking major and the schema uses the 6.x `url = env(...)` datasource), Fastify 4.29 and Next.js 14.2.35 as the stack specifies (newer majors exist), React 18.3. |
| M1-8 | Node version | Code runs on Node ≥ 20.19 and `.nvmrc` says 20, as specified. **Node 20 reached end of life in April 2026**; recommend Node 22 or 24 LTS for the VPS. Tested here on Node 22. **ALFA** |
| M1-9 | Foundry install | Pinned as npm devDependencies (`@foundry-rs/forge`, `@foundry-rs/anvil` 1.7.1, Foundry's official npm builds), so `pnpm install` provides forge and anvil. forge-std v1.16.2 is a git submodule: clone with `git clone --recursive` or run `git submodule update --init`. |
| M1-10 | Compiler target | solc 0.8.28, `evm_version = cancun`. Confirm the EVM version Robinhood Chain supports before the testnet deploy. |
| M1-11 | Local defaults | `.env.example` points at local anvil (chain 31337) instead of the unconfirmed Robinhood mainnet RPC. Robinhood values stay as comments until confirmed in Milestone 4. |
| M1-12 | Mainnet guard | `Deploy.s.sol` refuses chain 4663 unless `BLACKBOX_ALLOW_MAINNET=true`. |
| M1-13 | Tests needing services | `pnpm test` needs no database. The API's Postgres/Redis test is `pnpm --filter api test:integration`. The protocol's browser check needs Chromium (`pnpm --filter protocol exec playwright install chromium`); it is skipped with a warning if missing, and fails in CI. |

## Decided in Milestone 2

| # | Topic | Decision |
|---|---|---|
| M2-1 | Demo data | The site runs on the prototype's generator (ported exactly; a test runs the prototype's own code to prove it) with real protocol records and proofs. Every page that shows it carries a "Demo" label, and the hero pill reads "Demo: Sample data until the public launch". |
| M2-2 | Demo clock | Demo data is anchored to the start of the current hour so every process serves identical leaves; the latest demo decision can be up to ~1.5 h old. |
| M2-3 | Install command | `npx blackbox` belongs to an unrelated npm package. The site shows `npx @blackbox-rec/cli init` and, until `NEXT_PUBLIC_RECORDER_PUBLISHED=true`, install buttons open the waitlist. **ALFA: register the npm name before launch.** |
| M2-4 | Pricing | Prices stay visible with a "free during the beta" note (decision #6). |
| M2-5 | Copy changes | Added: FAQ, waitlist, docs, legal drafts, dashboard and connect copy, record-state messages. The API example uses `/v1/trust/<wallet>` (as in this file's partner API) instead of the prototype's `/v1/agents/...`. "Kestrel's real reasoning" drops "real" in demo mode. $BOX gets "Figures are planned... not an offer". |
| M2-6 | Unsealed trades | A trade sent while the recorder was offline has no record, so the replay shows no reasoning for it (the prototype showed some). |
| M2-7 | Contrast | `--tx3` lightened from `#666D80` to `#767E91` to meet 4.5:1 (docs/07). |
| M2-8 | Wallet | Injected wallets via EIP-1193 now; wagmi and WalletConnect arrive with real registration in Milestone 4. |
| M2-9 | Legal | Terms, privacy and risk pages are drafts with a visible banner and [placeholders]. **ALFA: have a lawyer review them, and fill in the company, jurisdiction and contact.** |
| M2-10 | Search engines | In demo mode robots.txt keeps agent, verify, dashboard and connect pages out of search results. |

## Decided before launch

| # | Topic | Decision |
|---|---|---|
| P-1 | Waitlist links | Confirm and unsubscribe links are HMAC-signed with `WAITLIST_SECRET` instead of stored tokens; they never expire. Unsubscribing deletes the row. |
| P-2 | Double opt-in | On when `SMTP_URL` is set. One confirmation email per address per 10 minutes, so the form can't be used to flood someone's inbox. |
| P-3 | Admin | A Bearer `ADMIN_TOKEN` (≥ 24 chars) protects the export; `/admin` keeps the token in the tab's memory only. |
| P-4 | Client IP | Fastify `trustProxy: 'loopback'`: rate limits use the real visitor IP behind Nginx; the header is ignored from anyone else. |
| P-5 | Headers | `X-Frame-Options`, `frame-ancestors 'none'`, `nosniff`, referrer and permissions policies; HSTS in Nginx. No full CSP yet: it needs nonces for Next.js and can break wallet extensions. |
| P-6 | Node on the VPS | The setup script installs Node 22 by default (Node 20 is end of life); `--node 20` pins the spec'd version. **ALFA** |
| P-7 | PM2 file | `infra/ecosystem.config.cjs` (was `.js`, which PM2 can't load in an ES module repo); it loads the root `.env`. |
| P-8 | Team | `apps/web/content/team.ts` starts empty, so the About page hides the team section until ALFA fills it in. **ALFA** |
