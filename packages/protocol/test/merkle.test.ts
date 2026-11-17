import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { bytesToHex, hashPair, leafHash, merkleProof, merkleRoot, verifyProof } from '../src/index.js';
import type { Hex } from '../src/index.js';

const leaf = fc.uint8Array({ minLength: 32, maxLength: 32 }).map((b) => bytesToHex(b));
const leaves = fc.array(leaf, { minLength: 1, maxLength: 70 });

describe('merkle', () => {
  it('a single leaf is its own root with an empty proof', () => {
    fc.assert(
      fc.property(leaf, (l) => {
        expect(merkleRoot([l])).toBe(l);
        expect(merkleProof([l], 0)).toEqual([]);
        expect(verifyProof(l, [], l)).toBe(true);
      }),
    );
  });

  it('every leaf proves into the root, for every batch size up to 70', () => {
    fc.assert(
      fc.property(leaves, (ls) => {
        const root = merkleRoot(ls);
        ls.forEach((l, i) => expect(verifyProof(l, merkleProof(ls, i), root)).toBe(true));
      }),
      { numRuns: 150 },
    );
  });

  it('proof length is at most ceil(log2(n))', () => {
    for (let n = 1; n <= 70; n++) {
      const ls = Array.from({ length: n }, (_, i) =>
        bytesToHex(Uint8Array.from({ length: 32 }, () => i + 1)),
      );
      for (let i = 0; i < n; i++)
        expect(merkleProof(ls, i).length).toBeLessThanOrEqual(Math.ceil(Math.log2(n)));
    }
  });

  it('a leaf outside the batch, a tampered proof or a wrong root does not verify', () => {
    fc.assert(
      fc.property(
        leaves.filter((l) => l.length > 1),
        leaf,
        fc.nat(),
        (ls, outsider, k) => {
          fc.pre(!ls.includes(outsider));
          const root = merkleRoot(ls);
          const i = k % ls.length;
          const proof = merkleProof(ls, i);
          expect(verifyProof(outsider, proof, root)).toBe(false);
          const tampered = [...proof];
          tampered[0] = outsider;
          expect(verifyProof(ls[i]!, tampered, root)).toBe(false);
          expect(verifyProof(ls[i]!, proof, outsider)).toBe(false);
        },
      ),
      { numRuns: 150 },
    );
  });

  it('pair hashing is symmetric', () => {
    fc.assert(
      fc.property(leaf, leaf, (a, b) => {
        expect(hashPair(a, b)).toBe(hashPair(b, a));
      }),
    );
  });

  it('leaf and interior-node hashes of the same 64 bytes differ (domain separation)', () => {
    fc.assert(
      fc.property(leaf, leaf, (a, b) => {
        const [lo, hi] = BigInt(a) <= BigInt(b) ? [a, b] : [b, a];
        expect(leafHash(lo, hi)).not.toBe(hashPair(lo, hi));
      }),
    );
  });

  it('rejects empty batches, bad leaves and bad indexes', () => {
    expect(() => merkleRoot([])).toThrow(RangeError);
    expect(() => merkleRoot(['0x1234' as Hex])).toThrow(TypeError);
    const ls = ['0x' + '11'.repeat(32)] as Hex[];
    expect(() => merkleProof(ls, 1)).toThrow(RangeError);
    expect(() => merkleProof(ls, -1)).toThrow(RangeError);
    expect(verifyProof('0xbad' as Hex, [], ls[0]!)).toBe(false);
  });
});
