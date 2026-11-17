import { describe, expect, it } from 'vitest';
import {
  agentIdFor,
  canonicalize,
  hashPair,
  leafHash,
  merkleProof,
  merkleRoot,
  PROTOCOL_VERSION,
  recordHash,
  sealDomainSeparator,
  sealRequestDigest,
  toolHash,
  verifyProof,
} from '../src/index.js';
import type { Address, Hex, JsonValue } from '../src/index.js';
import { loadVectors } from './helpers.js';
import { buildVectors } from './vectors-gen.js';

const v = loadVectors();

describe('vectors.json', () => {
  it('is up to date with the generator (run `pnpm --filter protocol vectors` after a deliberate change)', () => {
    expect(JSON.parse(JSON.stringify(buildVectors()))).toEqual(v);
  });

  it('matches PROTOCOL_VERSION', () => expect(v.protocolVersion).toBe(PROTOCOL_VERSION));

  it('counts match the arrays (the Solidity test relies on them)', () => {
    expect(v.counts).toEqual({
      records: v.records.length,
      batches: v.batches.length,
      pairs: v.pairs.length,
      agentIds: v.agentIds.length,
      toolHashes: v.toolHashes.length,
      eip712: v.eip712.length,
    });
  });
});

describe('records: record -> canonical -> recordHash -> leaf', () => {
  for (const r of v.records) {
    it(r.name, () => {
      expect(canonicalize(r.record)).toBe(r.canonical);
      expect(recordHash(r.record)).toBe(r.recordHash);
      expect(leafHash(r.salt as Hex, r.recordHash as Hex)).toBe(r.leaf);
    });
  }

  it('records chain through prev', () => {
    v.records.forEach((r, i) => {
      if (i > 0) expect(r.record.prev).toBe(v.records[i - 1]!.leaf);
    });
  });
});

describe('batches: leaves -> root -> proofs', () => {
  for (const b of v.batches) {
    it(b.name, () => {
      const leaves = b.leaves as Hex[];
      expect(merkleRoot(leaves)).toBe(b.root);
      leaves.forEach((leaf, i) => {
        expect(merkleProof(leaves, i)).toEqual(b.proofs[i]);
        expect(verifyProof(leaf, b.proofs[i] as Hex[], b.root as Hex)).toBe(true);
      });
    });
  }
});

describe('other hashes', () => {
  it('pairs', () => v.pairs.forEach((p) => expect(hashPair(p.a as Hex, p.b as Hex)).toBe(p.hash)));
  it('tool hashes', () =>
    v.toolHashes.forEach((t) => expect(toolHash(t.salt as Hex, t.value as JsonValue)).toBe(t.hash)));
  it('agent ids', () =>
    v.agentIds.forEach((a) =>
      expect(agentIdFor(a.wallet as Address, a.chainId, a.salt as Hex)).toBe(a.agentId),
    ));
  it('EIP-712 seal requests', () =>
    v.eip712.forEach((e) => {
      expect(sealDomainSeparator(e.chainId, e.verifyingContract as Address)).toBe(e.domainSeparator);
      expect(
        sealRequestDigest(e.chainId, e.verifyingContract as Address, {
          ...e.request,
          agentId: e.request.agentId as Hex,
          root: e.request.root as Hex,
        }),
      ).toBe(e.digest);
    }));
});
