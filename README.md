# Blackbox: handoff package for Claude Code

Blackbox is a flight recorder for AI trading agents. It records what an agent saw, why it acted and what it did, seals a fingerprint of that reasoning on Robinhood Chain **before** the trade lands, and turns the result into a public track record that nobody can fake or rewrite.

This folder is everything Claude Code needs to build the production version.

## Cara pakai (untuk ALFA / Michael)

1. Buat folder project kosong, misalnya `blackbox/`, lalu copy **semua isi folder ini** ke dalamnya.
2. Buka folder itu di Claude Code.
3. Copy isi `PROMPT.md` dan paste sebagai pesan pertama ke Claude Code.
4. Claude Code akan otomatis membaca `CLAUDE.md`, lalu mengikuti `docs/` dan mulai dari Milestone 1.
5. Setelah tiap milestone selesai, cek hasilnya, lalu suruh lanjut ke milestone berikutnya.

## What's inside

| File | What it covers |
|---|---|
| `PROMPT.md` | The first message to paste into Claude Code |
| `CLAUDE.md` | Standing instructions Claude Code reads every session: stack, rules, commands |
| `docs/01-PRODUCT.md` | What we're building, every page, every user flow, acceptance criteria |
| `docs/02-ARCHITECTURE.md` | Monorepo layout, services, data flow, the seal protocol end to end |
| `docs/03-RECORDER.md` | The `blackbox` CLI: MCP proxy, decision capture, sealing, offline rules, alerts |
| `docs/04-CONTRACTS.md` | AgentRegistry and SealRegistry on Robinhood Chain |
| `docs/05-API.md` | Every REST endpoint with request and response shapes |
| `docs/06-DATA-AND-METRICS.md` | Database tables and exact formulas for returns, drawdown, win rate, seal coverage, trust score |
| `docs/07-DESIGN.md` | Design system pulled from the approved prototype, page by page |
| `docs/08-DEPLOY.md` | Hostinger VPS with PM2 and Nginx, env vars, SSL, backups |
| `docs/09-ROADMAP.md` | Milestones with task checklists and definition of done |
| `docs/10-DECISIONS.md` | Assumptions made and questions ALFA still needs to answer |
| `design/prototype.html` | The approved UI. Open in a browser. This is the visual source of truth |
| `packages/contracts/` | AgentRegistry and SealRegistry (Foundry), tests and deploy script |
| `packages/protocol/` | The seal protocol: canonical JSON, hashing, Merkle proofs, `verify()`, golden vectors |
| `apps/api/prisma/schema.prisma` | Database schema and migrations |
| `infra/` | PM2 ecosystem file and Nginx config |
| `.env.example` | Every environment variable |

## Run it locally

Needs Node 20.19+ (22 or 24 recommended), pnpm 10, and Docker for Postgres and Redis.

```bash
git clone --recursive <repo> && cd blackbox
pnpm install
cp .env.example .env
pnpm db:up
pnpm --filter api prisma migrate dev
pnpm --filter contracts deploy:local    # in its own terminal; keeps anvil running
pnpm dev                                # web :3000, api :4000, indexer
pnpm test
```

## Important

- All data in `design/prototype.html` is mock data generated in the browser: agent names, returns, hashes, block numbers, prices. Production reads everything from chain and the database.
- The "Try to rewrite it" demo in the prototype uses a toy hash. Production uses keccak256 exactly as defined in `docs/02-ARCHITECTURE.md`.
- Robinhood Chain details (chain ID 4663, RPC, explorer) are taken from public projects on the chain. Claude Code must confirm them against official Robinhood Chain docs before deploying contracts.
