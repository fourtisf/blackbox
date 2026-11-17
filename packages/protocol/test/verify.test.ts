import { describe, expect, it } from 'vitest';
import { merkleProof, verify } from '../src/index.js';
import type {
  Address,
  CheckId,
  CheckStatus,
  DecisionRecord,
  Hex,
  VerifyInput,
  VerifyResult,
} from '../src/index.js';
import { loadVectors } from './helpers.js';

const v = loadVectors();
const rec = (i: number) => v.records[i]!;
const AGENT = {
  agentId: rec(0).record.agentId as Hex,
  wallet: v.agentIds[0]!.wallet as Address,
  boundBlock: 115_000_000,
};
const status = (r: VerifyResult): Record<CheckId, CheckStatus> =>
  Object.fromEntries(r.checks.map((c) => [c.id, c.status])) as Record<CheckId, CheckStatus>;

/** Record 0 is a buy sealed alone at block 115040420; its trade lands 7 blocks later. */
const sealedTrade = (over: Partial<VerifyInput> = {}): VerifyInput => ({
  leaf: rec(0).leaf as Hex,
  seq: 0,
  seal: { agentId: AGENT.agentId, root: rec(0).leaf as Hex, firstSeq: 0, count: 1, block: 115_040_420n },
  proof: [],
  agent: AGENT,
  trade: { tx: `0x${'ab'.repeat(32)}`, block: 115_040_427n, from: AGENT.wallet },
  reveal: { record: rec(0).record, salt: rec(0).salt as Hex },
  outcome: { pnl: 29.01, pct: 0.051 },
  ...over,
});

/** Records 1..4 sealed together; record 1 is a pass. */
const batch = v.batches[3]!;
const batchedPass = (over: Partial<VerifyInput> = {}): VerifyInput => ({
  leaf: rec(1).leaf as Hex,
  seq: 1,
  seal: { agentId: AGENT.agentId, root: batch.root as Hex, firstSeq: 1, count: 4, block: 115_040_500 },
  proof: merkleProof(batch.leaves as Hex[], 0),
  agent: AGENT,
  trade: null,
  reveal: { record: rec(1).record, salt: rec(1).salt as Hex },
  prevLeaf: rec(0).leaf as Hex,
  ...over,
});

describe('verify', () => {
  it('a revealed, sealed trade passes every check', () => {
    const r = verify(sealedTrade());
    expect(r.ok).toBe(true);
    expect(r.checks.map((c) => c.status)).toEqual(Array(7).fill('pass'));
    expect(r.record?.seq).toBe(0);
    expect(r.checks.find((c) => c.id === 'sealed_before_trade')!.detail).toContain('7 blocks before');
  });

  it('a private trade still proves its seal, order and wallet; reasoning checks are skipped', () => {
    const r = verify(sealedTrade({ reveal: null }));
    expect(r.ok).toBe(true);
    expect(status(r)).toMatchObject({
      seal_exists: 'pass',
      sequence_intact: 'pass',
      sealed_before_trade: 'pass',
      reasoning_matches: 'skip',
      reasoning_recorded: 'skip',
      wallet_bound: 'pass',
    });
    expect(r.record).toBeNull();
  });

  it('one edited character in the revealed reasoning fails the match', () => {
    const edited = {
      ...(rec(0).record as DecisionRecord),
      reasoning: rec(0).record.reasoning.replace('56', '57'),
    };
    const r = verify(sealedTrade({ reveal: { record: edited, salt: rec(0).salt as Hex } }));
    expect(r.ok).toBe(false);
    expect(status(r).reasoning_matches).toBe('fail');
  });

  it('a wrong salt fails the match', () => {
    const r = verify(sealedTrade({ reveal: { record: rec(0).record, salt: rec(1).salt as Hex } }));
    expect(status(r).reasoning_matches).toBe('fail');
  });

  it('a seal in the same block as the trade, or later, fails ordering', () => {
    for (const block of [115_040_427n, 115_040_430n]) {
      const r = verify(sealedTrade({ seal: { ...sealedTrade().seal!, block } }));
      expect(status(r).sealed_before_trade).toBe('fail');
    }
  });

  it('a trade from another wallet fails the binding', () => {
    const r = verify(
      sealedTrade({ trade: { ...sealedTrade().trade!, from: '0x000000000000000000000000000000000000dead' } }),
    );
    expect(status(r).wallet_bound).toBe('fail');
  });

  it('a seal from before the wallet was bound fails the binding', () => {
    const r = verify(sealedTrade({ agent: { ...AGENT, boundBlock: 115_040_421 } }));
    expect(status(r).wallet_bound).toBe('fail');
  });

  it('a seal from another agent fails', () => {
    const r = verify(sealedTrade({ seal: { ...sealedTrade().seal!, agentId: `0x${'99'.repeat(32)}` } }));
    expect(status(r).seal_exists).toBe('fail');
  });

  it('a revealed record of another agent fails the match', () => {
    const r = verify(
      sealedTrade({
        agent: { ...AGENT, agentId: `0x${'99'.repeat(32)}` },
        seal: { ...sealedTrade().seal!, agentId: `0x${'99'.repeat(32)}` },
      }),
    );
    expect(status(r).reasoning_matches).toBe('fail');
  });

  it('an unsealed trade fails the seal and the ordering', () => {
    const r = verify(sealedTrade({ leaf: null, seal: null, reveal: null }));
    expect(r.ok).toBe(false);
    expect(status(r)).toMatchObject({
      seal_exists: 'fail',
      sealed_before_trade: 'fail',
      sequence_intact: 'skip',
    });
  });

  it('an auto-captured trade is sealed but fails reasoning_recorded', () => {
    const auto = rec(3);
    const r = verify(
      sealedTrade({
        leaf: auto.leaf as Hex,
        seq: 3,
        seal: { agentId: AGENT.agentId, root: auto.leaf as Hex, firstSeq: 3, count: 1, block: 115_040_420n },
        reveal: { record: auto.record, salt: auto.salt as Hex },
      }),
    );
    expect(status(r)).toMatchObject({
      seal_exists: 'pass',
      reasoning_matches: 'pass',
      reasoning_recorded: 'fail',
    });
    expect(r.ok).toBe(false);
  });

  it('a revealed pass inside a batch proves its position and its chain', () => {
    const r = verify(batchedPass());
    expect(r.ok).toBe(true);
    expect(status(r)).toMatchObject({
      seal_exists: 'pass',
      sequence_intact: 'pass',
      sealed_before_trade: 'skip',
    });
    expect(r.checks.find((c) => c.id === 'sealed_before_trade')!.detail).toBe('A pass sends no trade.');
  });

  it('an unrevealed leaf inside a batch: membership proven, position not', () => {
    const r = verify(batchedPass({ reveal: null }));
    expect(status(r)).toMatchObject({ seal_exists: 'pass', sequence_intact: 'skip' });
  });

  it('a seq outside the sealed range fails', () => {
    const r = verify(batchedPass({ reveal: null, seq: 9 }));
    expect(status(r).sequence_intact).toBe('fail');
  });

  it('a claimed seq that disagrees with the revealed record fails', () => {
    const r = verify(batchedPass({ seq: 2 }));
    expect(status(r).sequence_intact).toBe('fail');
  });

  it('a broken prev chain fails (a deleted record in between)', () => {
    const r = verify(batchedPass({ prevLeaf: rec(2).leaf as Hex }));
    expect(status(r).sequence_intact).toBe('fail');
  });

  it('a trade linked to a pass fails', () => {
    const r = verify(
      batchedPass({ trade: { tx: `0x${'cd'.repeat(32)}`, block: 115_040_510, from: AGENT.wallet } }),
    );
    expect(status(r).sealed_before_trade).toBe('fail');
  });

  it('a wrong proof fails the seal', () => {
    const r = verify(batchedPass({ proof: merkleProof(batch.leaves as Hex[], 1) }));
    expect(status(r).seal_exists).toBe('fail');
  });

  it('an invalid revealed record is reported, not thrown', () => {
    const r = verify(sealedTrade({ reveal: { record: { nonsense: true }, salt: rec(0).salt as Hex } }));
    expect(status(r).reasoning_matches).toBe('fail');
    expect(r.checks.find((c) => c.id === 'reasoning_matches')!.detail).toMatch(/invalid/);
  });

  it('missing outcome or agent data is skipped, not failed', () => {
    const r = verify(sealedTrade({ outcome: null, agent: null }));
    expect(status(r)).toMatchObject({ outcome_from_chain: 'skip', wallet_bound: 'skip' });
    expect(r.ok).toBe(true);
  });
});
