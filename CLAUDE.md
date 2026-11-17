# CLAUDE.md: Blackbox

Standing instructions for every session in this repo. Details live in `docs/`.

## What Blackbox is

A flight recorder for AI trading agents. A local recorder (CLI + MCP proxy) captures each agent decision (what it saw, its reasoning, its tool calls, its intended trade), fingerprints it, and seals the fingerprint on Robinhood Chain before the trade is sent. An indexer reads the agent wallet's full on-chain history, so returns include every trade, sealed or not. The website shows a verified leaderboard, agent profiles with a decision replay, and a public verifier.

Markets in v1: tokenized stocks and memecoins on Robinhood Chain. Solana and Hyperliquid come later (design for multiple chains, build only Robinhood Chain now).

## Stack (fixed, do not swap)

- Monorepo: pnpm workspaces + Turborepo, TypeScript everywhere, Node 20 LTS
- `apps/web`: Next.js 14 App Router, React 18, Tailwind CSS with the CSS variables from `docs/07-DESIGN.md`
- `apps/api`: Fastify 4, Prisma, PostgreSQL 16, Redis 7, Zod for validation
- `apps/indexer`: Node worker using viem; writes to the same Postgres via Prisma
- `packages/protocol`: canonical JSON, hashing, Merkle trees, verification. Shared by recorder, api, indexer and web. Zero runtime dependencies besides `@noble/hashes`.
- `packages/recorder`: the `blackbox` CLI and MCP proxy (published to npm later), local storage in SQLite (`better-sqlite3`)
- `packages/contracts`: Foundry project, Solidity ^0.8.24
- Hosting: Hostinger VPS, PM2, Nginx, Certbot (see `docs/08-DEPLOY.md`)

## Commands (create these)

```
pnpm install
pnpm dev            # web :3000, api :4000, indexer
pnpm test           # all packages
pnpm lint && pnpm typecheck
pnpm --filter contracts test     # forge test
pnpm --filter api prisma migrate dev
pnpm --filter recorder build && node packages/recorder/dist/cli.js --help
```

## Rules

1. **Design fidelity.** `design/prototype.html` is the approved UI. Match it pixel for pixel: tokens, radii, spacing, type scale, glass surfaces, glow borders, the hero console, the canvas waveform, the bento tiles, the rewrite demo, the leaderboard table, the agent replay, the verifier. Port its CSS and drawing code into components. Do not redesign or "improve" the look.
2. **Copy.** Use the prototype's wording. Sentence case. No new marketing copy unless a page needs it, and then match the tone.
3. **Protocol is law.** Hashing and sealing follow `docs/02-ARCHITECTURE.md` exactly. All hashing code lives in `packages/protocol` and is never re-implemented elsewhere. Every change there needs tests and a version bump of `PROTOCOL_VERSION`.
4. **Privacy.** Reasoning, context and tool arguments stay on the user's machine unless the owner reveals them. The API must reject unrevealed plaintext.
5. **Numbers come from chain.** Returns, profit, drawdown and trade counts are computed by the indexer from wallet history. Never trust numbers sent by a recorder.
6. **Money safety.** Testnet first. No mainnet deploys, no real-fund transactions, no private keys in the repo. Keys come from env vars or the OS keychain.
7. **Verify facts.** Confirm Robinhood Chain parameters and any third-party MCP server config paths from official docs before hardcoding.
8. **Small, tested steps.** Work milestone by milestone (`docs/09-ROADMAP.md`). Each milestone ends green on lint, typecheck and tests.

## Robinhood Chain (confirm before use)

- Mainnet chain ID: 4663 (seen in public agent kits on the chain)
- RPC: `https://rpc.mainnet.chain.robinhood.com`
- Explorer: `https://robinhoodchain.blockscout.com`
- Stablecoin: USDG. Tokenized stocks trade against USDG. DEX: Uniswap v4.
- Testnet: look up the official testnet chain ID, RPC and faucet.

## Repo layout

```
apps/web          Next.js site (landing, leaderboard, agent, verify, connect)
apps/api          Fastify REST API + SSE live feed
apps/indexer      chain listener, metrics, alerts
packages/protocol hashing, merkle, verify
packages/recorder blackbox CLI + MCP proxy
packages/contracts Foundry: AgentRegistry, SealRegistry
infra/            pm2 + nginx
design/           prototype.html (source of truth)
docs/             specs
```
