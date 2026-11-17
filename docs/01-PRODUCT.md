# 01: Product spec

## One line

Every trade your agent makes, on the record.

## The problem

1. Owners can't see why their AI agent lost money. The agent runs 24/7 and the only trace is a wallet balance.
2. Agent performance claims can't be trusted. Returns are self-reported, screenshots are faked, backtests are cherry-picked.
3. Apps that route money to agents (copy-trading, vaults, credit) have no reliable way to judge an agent.

## The product

| Part | Who uses it | What it does |
|---|---|---|
| Recorder (`npx blackbox`) | Agent owners | Runs on the owner's machine. Wraps the agent's trading MCP servers, captures every decision, seals fingerprints on chain, keeps the full log locally. Free. |
| Website | Everyone | Landing page, verified leaderboard, agent profiles with replay, public verifier, owner onboarding. |
| Indexer + API | Website, partner apps | Reads chain history for every bound wallet, computes metrics, serves the site and the trust score API. |
| Contracts | Recorder, indexer | AgentRegistry binds an agent to one wallet. SealRegistry records sealed fingerprints in strict sequence. |

## Users

- **Agent owner** running a trading agent in Claude Code, Codex, OpenClaw, Hermes or any MCP client. Wants a replay for debugging and a public record to show off or attract followers.
- **Visitor / follower** browsing the leaderboard, checking whether an agent is real.
- **Partner app** (later) pulling trust scores before routing deposits.

## Pages (all in `design/prototype.html`)

### `/` Landing

Sections in this order, exactly as in the prototype:

1. Floating glass nav: Leaderboard, Verify, Product, Pricing, $BOX, Connect wallet, Install recorder.
2. Hero: live pill, headline, subline, two CTAs, copyable `npx blackbox` chip.
3. Hero console (product shot): sidebar of recording agents, REC bar with live block number, canvas waveform, live decision feed (rows go "Sealing" then "Sealed #block"), "Latest seal" card, 30-day mini chart. **In production the feed is real**: it streams from `GET /v1/feed/live` (SSE) and shows the latest public seals across agents. If the stream is down, show the last 7 seals from `GET /v1/feed/recent`.
4. "Records agents running in" row.
5. Bento: Replay every decision, Sealed before it trades, Results from the wallet, Alerts on Telegram, Private by default. Use one real featured decision from the top agent (API: `GET /v1/featured`).
6. "Built so the record can't be rewritten": three steps + the **rewrite demo**. The demo must use the real hashing from `packages/protocol` running in the browser on a real revealed decision: editing the text recomputes the leaf with the published salt and compares it to the sealed leaf.
7. Podium: top 3 agents by 30-day return, link to leaderboard.
8. Markets list (Live / Next / Later).
9. API section with Response / Request tabs.
10. Pricing: Recorder, Verified, Pro, API.
11. $BOX section (static content until token launch; see decisions).
12. Final CTA, footer.

### `/leaderboard`

- KPIs: verified agents, trades recorded in 30 days, seals today, median seal coverage.
- Filters: market (all, stocks, memecoins), period (7D, 30D, 90D), agent app, search by name or wallet. Filters live in the URL query so links are shareable.
- Sortable columns: return, profit, win rate, drawdown, trades, sealed. Default sort: return descending.
- Row click opens the agent page. Mobile hides all columns except rank, agent and return.
- Server-side pagination at 50 rows.

### `/agent/[slug]`

- Header: avatar (deterministic gradient), name, verified badge with current rank, tags (market, runtime, model, short wallet, recording since), Copy link, Follow (disabled until copy-trading exists; shows toast).
- Six stat tiles: 30-day return (+profit), 90-day or since-start return, win rate, max drawdown, trades in 30 days, seal coverage.
- Return over time chart (30D / All) with hover tooltip. Data: daily time-weighted return series.
- Replay: timeline markers, decision list (newest first), detail panel (what it saw, why it acted, what it called, on chain seal + trade with block numbers, outcome), Play from oldest, keyboard up/down.
- Unrevealed decisions show kind, asset, time, seal hash and blocks, outcome, and a "Reasoning private" state instead of the text.
- Unsealed trades show the "No seal for this trade" warning.
- Three trust cards at the bottom.

### `/verify` and `/verify/[hash]`

- Input accepts a seal leaf hash or a trade tx hash.
- Result card lists checks: fingerprint found (block), sealed before the trade (block gap), reasoning matches the seal (only if revealed), wallet bound to the agent (since date), outcome read from the wallet.
- Unsealed trade shows the warning variant. Unknown hash shows the not-found card with guidance.
- Verification runs in the browser with `packages/protocol` against data from the API **and** re-checks the seal event directly over RPC, so a user doesn't have to trust our server.

### `/connect` (new, not in prototype; reuse its components)

Owner onboarding, reached from "Install recorder" after the CLI prints a link:
1. Connect wallet (Robinhood Chain).
2. Review agent name, market, runtime (pre-filled by the CLI via a one-time code).
3. Sign the `register` transaction on AgentRegistry (authorizes the recorder's sealer key).
4. Optional: link Telegram for alerts.
5. Done screen with profile link and badge embed code.

Style it with the same glass cards, steps component and buttons as the landing page.

## Key flows

**Install and verify an agent**
1. Owner runs `npx blackbox init`. CLI detects agent apps, shows which trading MCP servers it will wrap, asks once, backs up configs, writes changes.
2. CLI creates a local sealer key and prints a `/connect?code=...` link.
3. Owner connects wallet on the site and signs `register`. Record starts at that block.
4. From now on each decision is captured and sealed; trades show up on the profile within one indexer cycle.

**A trade decision**
1. Agent calls `record_decision` with reasoning and intent (the injected skill tells it to).
2. Agent calls the trading tool (e.g. `swap`). The proxy checks a fresh matching decision exists, seals it on chain, waits for inclusion (max 2 s), then forwards the call.
3. Trade lands in a later block. Indexer matches it to the decision and computes the outcome.

**Reveal**
Owner picks a reveal policy in the CLI: `private`, `delayed` (default 24 h after the decision), or `public`. Revealed decisions upload plaintext + salt + Merkle proof; the API verifies the hash before storing.

## Acceptance criteria (product level)

- A visitor can pick any trade on any profile, paste its hash into `/verify`, and see every check pass, with the seal block strictly lower than the trade block.
- Editing one character of a revealed reasoning in the rewrite demo flips the verdict to "No seal matches".
- An agent's returns change when it makes a losing trade even if the recorder was off (coverage drops, returns still include the trade).
- Deleting a decision locally is detectable: the on-chain sequence has a gap that the profile reports.
- Every page matches the prototype at 1440 px and 390 px widths.
- Lighthouse on the landing page: performance ≥ 85, accessibility ≥ 95 on desktop.

## Out of scope for v1

Copy-trading, payments and plans (beta is free), $BOX token contracts, Solana, Hyperliquid, CEX import, mobile app.
