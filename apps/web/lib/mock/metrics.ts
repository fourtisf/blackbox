/**
 * Trust score v1 and leaderboard eligibility, exactly as published in docs/06-DATA-AND-METRICS.md.
 * The demo computes them here; from Milestone 4 the indexer computes them from chain data.
 */

export interface TrustInputs {
  recordAgeDays: number;
  sealCoverage30d: number;
  maxDrawdown90d: number;
  /** Daily time-weighted returns r_d over the last 90 days. */
  dailyReturns90d: number[];
  trades90d: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Annualized Sharpe ratio of daily returns (365 trading days: these markets trade every day). */
export function sharpeDaily(returns: number[]): number {
  if (returns.length < 2) return 0;
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  const sd = Math.sqrt(variance);
  return sd === 0 ? 0 : (mean / sd) * Math.sqrt(365);
}

/** 0 to 100, or null ("New") for agents under 14 days old. */
export function trustScore(i: TrustInputs): number | null {
  if (i.recordAgeDays < 14) return null;
  const age = Math.min(1, Math.log10(1 + i.recordAgeDays) / Math.log10(181));
  const cov = clamp(i.sealCoverage30d, 0, 1);
  const dd = 1 - Math.min(1, Math.abs(i.maxDrawdown90d) / 0.5);
  const cons = clamp(sharpeDaily(i.dailyReturns90d) / 3, 0, 1);
  const sample = Math.min(1, i.trades90d / 100);
  return Math.round(100 * (0.25 * age + 0.25 * cov + 0.2 * dd + 0.2 * cons + 0.1 * sample));
}

export const TRUST_WEIGHTS = {
  age: 0.25,
  coverage: 0.25,
  drawdown: 0.2,
  consistency: 0.2,
  sample: 0.1,
} as const;

export interface EligibilityInputs {
  active: boolean;
  recordAgeDays: number;
  tradesInPeriod: number;
  sealCoverage30d: number;
}

export const ELIGIBILITY = { minAgeDays: 7, minTrades: 5, minCoverage: 0.8 } as const;

/** Reasons an agent is not ranked; empty means it is eligible. */
export function ineligibleReasons(i: EligibilityInputs, periodDays = 30): string[] {
  const out: string[] = [];
  if (!i.active) out.push('The record was closed by its owner.');
  if (i.recordAgeDays < ELIGIBILITY.minAgeDays) {
    out.push(`Recording for ${i.recordAgeDays} days. Ranking starts at ${ELIGIBILITY.minAgeDays} days.`);
  }
  if (i.tradesInPeriod < ELIGIBILITY.minTrades) {
    out.push(
      `${i.tradesInPeriod} trades in ${periodDays} days. Ranking needs at least ${ELIGIBILITY.minTrades}.`,
    );
  }
  if (i.sealCoverage30d < ELIGIBILITY.minCoverage) {
    out.push(
      `Seal coverage is ${Math.round(i.sealCoverage30d * 100)}%. Ranking needs ${ELIGIBILITY.minCoverage * 100}%.`,
    );
  }
  return out;
}

/** Win rate is shown only from 10 closed round trips. */
export const MIN_CLOSED_TRIPS = 10;
