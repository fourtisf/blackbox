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
