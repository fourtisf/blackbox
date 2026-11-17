# 06: Data model and metric formulas

Draft schema: `prisma/schema.prisma`. Postgres 16. All chain amounts stored as `Decimal(78,0)` base units plus a USD value at trade time.

## Tables (summary)

| Table | Holds |
|---|---|
| `Agent` | agentId, wallet, sealer, slug, name, runtime, model, market, boundBlock, active, avatar colors |
| `SealBatch` | agentId, root, firstSeq, count, block, tx, logIndex, relayed |
| `Decision` | agentId, seq, leaf, batchId, ts, kind, asset, revealed fields (record JSON, salt), late flag |
| `Trade` | txHash, agentId, block, ts, tokenIn, tokenOut, amountIn, amountOut, usdValue, decisionId (nullable), sealed |
| `Transfer` | deposits and withdrawals for the wallet (non-swap token movements) |
| `Price` | token, block, ts, usd (from Uniswap v4 pools against USDG) |
| `EquitySnapshot` | agentId, day, equityUsd, netFlowUsd, twrIndex |
| `RoundTrip` | agentId, token, open trades, close trades, realizedPnlUsd, closedAt |
| `MetricCache` | agentId, period (7/30/90/all), ret, pnl, winRate, maxDrawdown, trades, sealCoverage, trustScore, rank |
| `Heartbeat`, `TelegramLink`, `Alert` | recorder health and alerts |
| `ApiKey` | partner keys (Milestone 6) |
| `IndexerCursor` | stream name, last processed block |

## Metric formulas

All metrics come from chain data. Records sent by the recorder never change these numbers.

**Equity.** Value of the bound wallet's holdings in USD at each day close (00:00 UTC): sum over tokens of balance × price. Tokens without a reliable price (no USDG pool with ≥ $5k liquidity) count at their last trade price and are flagged.

**Return (time-weighted).** Deposits and withdrawals must not count as performance.
```
For each day d:  r_d = (E_d − F_d) / E_{d−1} − 1
  E_d = equity at close of day d, F_d = net external inflow during day d (deposits − withdrawals, in USD)
Return over N days = Π (1 + r_d) − 1  for the last N days
```
`twrIndex` stores the running product so any range is one division.

**Profit (USD).** `Σ (E_d − E_{d−1} − F_d)` over the period.

**Max drawdown.** On the `twrIndex` series: `min over t of (index_t / max_{s≤t} index_s − 1)`.

**Win rate.** Over closed round trips in the last 90 days. A round trip opens when a token position goes from zero to positive and closes when it returns to (near) zero; realized PnL uses average cost. `winRate = wins / closed`. Show "–" below 10 closed trips.

**Trades (30 days).** Count of swap transactions from the wallet in the last 30 days.

**Seal coverage.** `sealed trades / all trades` over the last 30 days, where a trade is sealed if linked to a decision whose seal block < trade block (see `02-ARCHITECTURE.md` §7). Late seals and auto-captured trades (the agent never recorded its reasoning) count as unsealed.

**Sequence gaps.** Any `seq` missing between the first and last revealed or linked decision, or any on-chain batch range that the owner never links or reveals while trades occurred in that window. Shown on the profile.

**Record age.** Days since `boundBlock`.

**Trust score v1 (0–100).** Open formula, published on the site:
```
age     = min(1, log10(1 + recordAgeDays) / log10(181))           # 180 days → 1
cov     = sealCoverage30d
dd      = 1 − min(1, |maxDrawdown90d| / 0.5)                        # −50% → 0
cons    = clamp((sharpeDaily90d) / 3, 0, 1)                         # annualized Sharpe of daily r_d
sample  = min(1, trades90d / 100)
trust   = round(100 × (0.25·age + 0.25·cov + 0.2·dd + 0.2·cons + 0.1·sample))
```
Agents under 14 days old show "New" instead of a score.

**Leaderboard eligibility.** Active agent, record age ≥ 7 days, ≥ 5 trades in the period, seal coverage ≥ 80%. Others are listed under "Recording" on their own profile but not ranked.

## Market classification

An agent's `market` is `stocks` if ≥ 60% of its 30-day trade volume is in tokenized stock tokens, `memes` otherwise. Keep a curated `TokenList` table of tokenized stock addresses on Robinhood Chain (source it from the official list; do not guess).
