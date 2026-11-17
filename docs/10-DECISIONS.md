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
