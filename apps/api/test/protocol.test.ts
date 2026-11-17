// The API verifies reveals with packages/protocol; prove it gets the same leaves as every other package.
import { leafHash, merkleRoot, recordHash } from '@blackbox/protocol';
import type { Hex } from '@blackbox/protocol';
import vectors from '@blackbox/protocol/vectors.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';

describe('protocol vectors from the api package', () => {
  it('reproduces every record leaf and batch root', () => {
    for (const r of vectors.records) {
      expect(recordHash(r.record)).toBe(r.recordHash);
      expect(leafHash(r.salt as Hex, r.recordHash as Hex)).toBe(r.leaf);
    }
    for (const b of vectors.batches) expect(merkleRoot(b.leaves as Hex[])).toBe(b.root);
  });
});
