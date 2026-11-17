import { describe, expect, it } from 'vitest';
import { ineligibleReasons, sharpeDaily, trustScore } from '@/lib/mock/metrics';

describe('trust score v1 (docs/06)', () => {
  const base = {
    recordAgeDays: 180,
    sealCoverage30d: 1,
    maxDrawdown90d: 0,
    dailyReturns90d: [0.01, 0.012, 0.009, 0.011],
    trades90d: 100,
  };
  it('is 100 for a perfect record', () => expect(trustScore(base)).toBe(100));
  it('is "New" (null) under 14 days', () => expect(trustScore({ ...base, recordAgeDays: 13 })).toBeNull());
  it('weights each part as published', () => {
    expect(trustScore({ ...base, sealCoverage30d: 0 })).toBe(75);
    expect(trustScore({ ...base, maxDrawdown90d: -0.5 })).toBe(80);
    expect(trustScore({ ...base, trades90d: 0 })).toBe(90);
    expect(trustScore({ ...base, dailyReturns90d: [0.01, -0.01, 0.01, -0.01] })).toBe(80);
  });
  it('sharpe is annualized over 365 days', () => {
    expect(sharpeDaily([0.01, 0.03])).toBeCloseTo((0.02 / Math.sqrt(0.0002)) * Math.sqrt(365), 6);
    expect(sharpeDaily([0.01])).toBe(0);
  });
});

describe('leaderboard eligibility', () => {
  it('lists every reason', () => {
    expect(
      ineligibleReasons({ active: true, recordAgeDays: 30, tradesInPeriod: 50, sealCoverage30d: 0.99 }),
    ).toEqual([]);
    const r = ineligibleReasons({ active: false, recordAgeDays: 3, tradesInPeriod: 2, sealCoverage30d: 0.7 });
    expect(r).toHaveLength(4);
    expect(r.join(' ')).toMatch(/7 days.*at least 5.*80%/);
  });
});
