import { describe, expect, it } from 'vitest';
import { assertDecisionRecord, recordHash, recordProblems, RecordError, ZERO_HASH } from '../src/index.js';
import type { DecisionRecord } from '../src/index.js';
import { loadVectors } from './helpers.js';

const v = loadVectors();
const buy = () => structuredClone(v.records[0]!.record) as DecisionRecord;
const pass = () => structuredClone(v.records[1]!.record) as DecisionRecord;

describe('recordProblems', () => {
  it('accepts every vector record', () => {
    for (const r of v.records) expect(recordProblems(r.record), r.name).toEqual([]);
  });

  const cases: [string, () => unknown, RegExp][] = [
    ['not an object', () => 'hello', /must be an object/],
    ['unknown field', () => ({ ...buy(), extra: 1 }), /unknown field extra/],
    [
      'missing field',
      () => {
        const r: Partial<DecisionRecord> = buy();
        delete r.prev;
        return r;
      },
      /missing prev/,
    ],
    ['wrong version', () => ({ ...buy(), v: 2 }), /v must be 1/],
    [
      'uppercase agentId',
      () => ({ ...buy(), agentId: buy().agentId.toUpperCase().replace('0X', '0x') }),
      /agentId/,
    ],
    ['negative seq', () => ({ ...buy(), seq: -1 }), /seq/],
    ['fractional ts', () => ({ ...buy(), ts: 1.5 }), /ts/],
    ['unknown kind', () => ({ ...buy(), kind: 'hold' }), /kind/],
    ['pass with an intent', () => ({ ...pass(), intent: buy().intent }), /intent: null/],
    ['buy without an intent', () => ({ ...buy(), intent: null }), /must have an intent/],
    [
      'checksummed token address',
      () => ({ ...buy(), intent: { ...buy().intent!, tokenIn: '0xAbCd' + buy().intent!.tokenIn.slice(6) } }),
      /tokenIn/,
    ],
    [
      'same token in and out',
      () => ({ ...buy(), intent: { ...buy().intent!, tokenOut: buy().intent!.tokenIn } }),
      /must differ/,
    ],
    [
      'amount with leading zero',
      () => ({ ...buy(), intent: { ...buy().intent!, amountIn: '0100' } }),
      /amountIn/,
    ],
    ['zero amount', () => ({ ...buy(), intent: { ...buy().intent!, amountIn: '0' } }), /amountIn/],
    ['numeric amount', () => ({ ...buy(), intent: { ...buy().intent!, amountIn: 100 } }), /amountIn/],
    [
      'slippage over 100%',
      () => ({ ...buy(), intent: { ...buy().intent!, maxSlippageBps: 10001 } }),
      /maxSlippageBps/,
    ],
    ['empty symbol', () => ({ ...buy(), asset: { ...buy().asset, symbol: '' } }), /symbol/],
    ['context with NaN', () => ({ ...buy(), context: { x: NaN } }), /context is not canonical/],
    ['empty reasoning without auto-capture', () => ({ ...buy(), reasoning: '  ' }), /must not be empty/],
    ['auto-captured with reasoning', () => ({ ...buy(), autoCaptured: true }), /empty reasoning/],
    ['auto-captured pass', () => ({ ...pass(), autoCaptured: true, reasoning: '' }), /only trades/],
    [
      'tool call with raw args',
      () => ({ ...buy(), toolCalls: [{ name: 'get_quote', args: 'NVDA', result: ZERO_HASH }] }),
      /args must be a 32-byte hash/,
    ],
    ['seq 0 with a prev', () => ({ ...buy(), prev: pass().prev }), /zero hash for seq 0/],
    ['seq > 0 with zero prev', () => ({ ...pass(), prev: ZERO_HASH }), /previous leaf/],
    ['lone surrogate in reasoning', () => ({ ...buy(), reasoning: 'x\ud800' }), /reasoning is not valid/],
  ];
  for (const [name, make, re] of cases) {
    it(`rejects: ${name}`, () => expect(recordProblems(make()).join('\n')).toMatch(re));
  }
});

describe('recordHash and assertDecisionRecord', () => {
  it('throw RecordError with every problem listed', () => {
    const bad = { ...buy(), v: 2, seq: -1 };
    expect(() => assertDecisionRecord(bad)).toThrow(RecordError);
    try {
      recordHash(bad);
    } catch (e) {
      expect((e as RecordError).problems.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('do not depend on key order', () => {
    const r = buy();
    const reversed = Object.fromEntries(Object.entries(r).reverse());
    expect(recordHash(reversed)).toBe(recordHash(r));
  });

  it('change when any single character of the reasoning changes', () => {
    const r = buy();
    const h = recordHash(r);
    for (let i = 0; i < r.reasoning.length; i += 7) {
      const edited = { ...r, reasoning: r.reasoning.slice(0, i) + '#' + r.reasoning.slice(i + 1) };
      if (edited.reasoning !== r.reasoning) expect(recordHash(edited)).not.toBe(h);
    }
  });
});
