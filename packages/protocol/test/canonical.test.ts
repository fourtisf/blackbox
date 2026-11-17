import { readFileSync } from 'node:fs';
import canonicalizeReference from 'canonicalize';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { canonicalize, CanonicalizationError } from '../src/index.js';
import { here } from './helpers.js';

describe('RFC 8785 reference test data', () => {
  for (const name of ['arrays', 'french', 'structures', 'unicode', 'values', 'weird']) {
    it(`${name}.json canonicalizes to the exact reference bytes`, () => {
      const input = JSON.parse(readFileSync(here(`rfc8785/input/${name}.json`), 'utf8'));
      const expected = readFileSync(here(`rfc8785/output/${name}.json`)); // raw bytes, no trailing newline
      expect(Buffer.from(canonicalize(input), 'utf8').equals(expected)).toBe(true);
    });
  }
});

describe('number serialization', () => {
  // IEEE-754 samples published with the RFC reference data (hex-ieee, expected).
  const samples: [string, string][] = [
    ['4340000000000001', '9007199254740994'],
    ['4340000000000002', '9007199254740996'],
    ['444b1ae4d6e2ef50', '1e+21'],
    ['3eb0c6f7a0b5ed8d', '0.000001'],
    ['3eb0c6f7a0b5ed8c', '9.999999999999997e-7'],
    ['8000000000000000', '0'],
    ['0', '0'],
  ];
  const fromHex = (h: string) => new DataView(BigUint64Array.of(BigInt('0x' + h)).buffer).getFloat64(0, true);
  for (const [h, want] of samples) it(`0x${h} -> ${want}`, () => expect(canonicalize(fromHex(h))).toBe(want));

  it('matches ECMAScript Number serialization for any finite double', () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true, noDefaultInfinity: true }), (d) => {
        expect(canonicalize(d)).toBe(Object.is(d, -0) ? '0' : String(d));
      }),
      { numRuns: 5000 },
    );
  });
});

describe("agrees with the RFC author's reference implementation", () => {
  it('on random JSON documents', () => {
    const doc = fc.jsonValue({ maxDepth: 4 }).filter((v) => {
      try {
        canonicalize(v);
        return true;
      } catch {
        return false; // fast-check can produce lone surrogates, which I-JSON forbids
      }
    });
    fc.assert(
      fc.property(doc, (v) => {
        expect(canonicalize(v)).toBe(canonicalizeReference(v));
        expect(canonicalize(JSON.parse(canonicalize(v)))).toBe(canonicalize(v)); // idempotent
      }),
      { numRuns: 3000 },
    );
  });
});

describe('rejects anything that is not plain I-JSON', () => {
  const bad: [string, unknown][] = [
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['undefined', undefined],
    ['BigInt', 1n],
    ['function', () => 1],
    ['Date', new Date(0)],
    ['Map', new Map()],
    ['nested undefined', { a: undefined }],
    ['lone high surrogate', 'x\ud800'],
    ['lone low surrogate', '\udc00x'],
    ['lone surrogate key', { '\ud83d': 1 }],
    ['sparse array', [1, , 3]], // eslint-disable-line no-sparse-arrays
  ];
  for (const [name, v] of bad) it(name, () => expect(() => canonicalize(v)).toThrow(CanonicalizationError));

  it('circular references', () => {
    const a: Record<string, unknown> = {};
    a.self = a;
    expect(() => canonicalize(a)).toThrow(/circular/);
  });

  it('allows the same object twice when it is not a cycle', () => {
    const shared = { x: 1 };
    expect(canonicalize({ a: shared, b: shared })).toBe('{"a":{"x":1},"b":{"x":1}}');
  });

  it('accepts surrogate pairs and objects without a prototype', () => {
    const o = Object.create(null) as Record<string, unknown>;
    o.b = '😀';
    o.a = 1;
    expect(canonicalize(o)).toBe('{"a":1,"b":"😀"}');
  });
});
