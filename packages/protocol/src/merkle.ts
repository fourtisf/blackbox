import { compareBytes, concatBytes, hexToBytes, isHex32 } from './bytes.js';
import type { Hex } from './bytes.js';
import { keccak256, NODE_PREFIX } from './hash.js';

/**
 * Sorted-pair Merkle tree.
 * - Interior node: keccak256(0x01 || min(a, b) || max(a, b)), so proofs need no direction bits.
 * - An odd node at the end of a level is promoted unchanged.
 * - A single leaf is its own root (trade decisions are sealed as batches of one).
 * Sorted pairs mean a proof shows a leaf is in a batch, not its position: a leaf's
 * seq is proven by count == 1 or by revealing the record, which contains seq.
 */

export function hashPair(a: Hex, b: Hex): Hex {
  const x = hexToBytes(a, 32);
  const y = hexToBytes(b, 32);
  const [lo, hi] = compareBytes(x, y) <= 0 ? [x, y] : [y, x];
  return keccak256(concatBytes(Uint8Array.of(NODE_PREFIX), lo, hi));
}

/** All levels, leaves first, root last. */
export function merkleLevels(leaves: readonly Hex[]): Hex[][] {
  if (leaves.length === 0) throw new RangeError('A batch needs at least one leaf');
  leaves.forEach((l, i) => {
    if (!isHex32(l)) throw new TypeError(`leaves[${i}] is not a 32-byte lowercase hex hash`);
  });
  const levels: Hex[][] = [[...leaves]];
  while (levels[levels.length - 1]!.length > 1) {
    const cur = levels[levels.length - 1]!;
    const next: Hex[] = [];
    for (let i = 0; i < cur.length; i += 2)
      next.push(i + 1 < cur.length ? hashPair(cur[i]!, cur[i + 1]!) : cur[i]!);
    levels.push(next);
  }
  return levels;
}

export const merkleRoot = (leaves: readonly Hex[]): Hex => merkleLevels(leaves).at(-1)![0]!;

/** Sibling hashes from the leaf up to the root. Promoted levels add nothing. */
export function merkleProof(leaves: readonly Hex[], index: number): Hex[] {
  const levels = merkleLevels(leaves);
  if (!Number.isInteger(index) || index < 0 || index >= leaves.length)
    throw new RangeError(`No leaf at index ${index}`);
  const proof: Hex[] = [];
  let i = index;
  for (const level of levels.slice(0, -1)) {
    const sibling = i % 2 === 0 ? i + 1 : i - 1;
    if (sibling < level.length) proof.push(level[sibling]!);
    i = Math.floor(i / 2);
  }
  return proof;
}

export function verifyProof(leaf: Hex, proof: readonly Hex[], root: Hex): boolean {
  if (!isHex32(leaf) || !isHex32(root) || !proof.every(isHex32)) return false;
  return proof.reduce<Hex>((node, sibling) => hashPair(node, sibling), leaf) === root;
}
