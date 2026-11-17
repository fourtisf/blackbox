/** Bundled for the browser by scripts/browser-check.mjs. Re-runs the golden vectors with no Node APIs. */
import vectors from '../vectors.json' with { type: 'json' };
import {
  agentIdFor,
  canonicalize,
  leafHash,
  merkleProof,
  merkleRoot,
  newSalt,
  recordHash,
  sealRequestDigest,
  toolHash,
  verify,
  verifyProof,
} from '../src/index.js';
import type { Address, Hex, JsonValue } from '../src/index.js';

export function run(): { checks: number; failures: string[]; userAgent: string } {
  const failures: string[] = [];
  let checks = 0;
  const eq = (name: string, got: unknown, want: unknown) => {
    checks++;
    if (got !== want) failures.push(`${name}: got ${String(got)}, want ${String(want)}`);
  };

  for (const r of vectors.records) {
    eq(`${r.name} canonical`, canonicalize(r.record), r.canonical);
    eq(`${r.name} recordHash`, recordHash(r.record), r.recordHash);
    eq(`${r.name} leaf`, leafHash(r.salt as Hex, r.recordHash as Hex), r.leaf);
  }
  for (const b of vectors.batches) {
    eq(`${b.name} root`, merkleRoot(b.leaves as Hex[]), b.root);
    b.leaves.forEach((l, i) => {
      eq(
        `${b.name} proof ${i}`,
        JSON.stringify(merkleProof(b.leaves as Hex[], i)),
        JSON.stringify(b.proofs[i]),
      );
      eq(`${b.name} verify ${i}`, verifyProof(l as Hex, b.proofs[i] as Hex[], b.root as Hex), true);
    });
  }
  for (const t of vectors.toolHashes)
    eq('toolHash', toolHash(t.salt as Hex, t.value as unknown as JsonValue), t.hash);
  for (const a of vectors.agentIds)
    eq('agentId', agentIdFor(a.wallet as Address, a.chainId, a.salt as Hex), a.agentId);
  for (const e of vectors.eip712) {
    const req = { ...e.request, agentId: e.request.agentId as Hex, root: e.request.root as Hex };
    eq('eip712', sealRequestDigest(e.chainId, e.verifyingContract as Address, req), e.digest);
  }

  // The rewrite demo path: the same record verifies; one edited character does not.
  const r0 = vectors.records[0]!;
  const base = {
    leaf: r0.leaf as Hex,
    seal: { agentId: r0.record.agentId as Hex, root: r0.leaf as Hex, firstSeq: 0, count: 1, block: 10 },
    trade: null,
  };
  eq('verify original', verify({ ...base, reveal: { record: r0.record, salt: r0.salt as Hex } }).ok, true);
  const edited = { ...r0.record, reasoning: r0.record.reasoning + '!' };
  eq('verify edited', verify({ ...base, reveal: { record: edited, salt: r0.salt as Hex } }).ok, false);
  eq('newSalt format', /^0x[0-9a-f]{64}$/.test(newSalt()), true);

  return { checks, failures, userAgent: navigator.userAgent };
}
