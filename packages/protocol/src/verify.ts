import { isHex32 } from './bytes.js';
import type { Address, Hex } from './bytes.js';
import { recordLeaf } from './hash.js';
import { verifyProof } from './merkle.js';
import { recordProblems } from './record.js';
import type { DecisionRecord } from './record.js';

export type CheckId =
  | 'seal_exists'
  | 'sequence_intact'
  | 'sealed_before_trade'
  | 'reasoning_matches'
  | 'reasoning_recorded'
  | 'wallet_bound'
  | 'outcome_from_chain';

/** pass: proven. fail: disproven. skip: cannot be checked with the data given (e.g. private reasoning). */
export type CheckStatus = 'pass' | 'fail' | 'skip';

export interface Check {
  id: CheckId;
  status: CheckStatus;
  detail: string;
}

type Num = bigint | number;

/** A SealRegistry `Sealed` log, as read from the API or directly over RPC. */
export interface SealEvent {
  agentId: Hex;
  root: Hex;
  firstSeq: Num;
  count: Num;
  /** Block of the Sealed log: the seal block. */
  block: Num;
}

export interface VerifyInput {
  /** The sealed leaf. Absent when verifying a trade that was never sealed. */
  leaf?: Hex | null;
  /** The decision's claimed seq (from a link or the API). A revealed record's own seq takes precedence. */
  seq?: Num | null;
  seal?: SealEvent | null;
  /** Merkle proof from leaf to seal.root; empty for a batch of one. */
  proof?: readonly Hex[];
  /** The agent as registered in AgentRegistry. */
  agent?: { agentId: Hex; wallet: Address; boundBlock: Num } | null;
  /** The trade transaction linked to this decision. */
  trade?: { tx: Hex; block: Num; from: Address } | null;
  /** Present only when the owner revealed the record. */
  reveal?: { record: unknown; salt: Hex } | null;
  /** Leaf of seq - 1, when known, to check the `prev` chain. */
  prevLeaf?: Hex | null;
  /** Outcome computed by the indexer from wallet history. */
  outcome?: { pnl: number; pct: number } | null;
}

export interface VerifyResult {
  /** True when no check failed. Skipped checks do not fail a record. */
  ok: boolean;
  checks: Check[];
  /** The revealed record, when it was valid and matched the leaf. */
  record: DecisionRecord | null;
}

const big = (v: Num): bigint => BigInt(v);
const pass = (id: CheckId, detail: string): Check => ({ id, status: 'pass', detail });
const fail = (id: CheckId, detail: string): Check => ({ id, status: 'fail', detail });
const skip = (id: CheckId, detail: string): Check => ({ id, status: 'skip', detail });

/**
 * Runs every check in docs/02-ARCHITECTURE.md §9 on data the caller supplies.
 * Pure and synchronous: the browser fetches the seal log over RPC itself and
 * passes it in, so nobody has to trust the Blackbox API's own verdict.
 */
export function verify(input: VerifyInput): VerifyResult {
  const { seal, agent, trade, reveal, outcome } = input;
  const leaf = input.leaf ?? null;
  const proof = input.proof ?? [];
  const checks: Check[] = [];

  // Reveal first: other checks use the record's own fields when it is genuine.
  let record: DecisionRecord | null = null;
  let revealCheck: Check;
  if (!reveal) {
    revealCheck = skip('reasoning_matches', 'Reasoning is private.');
  } else {
    const problems = recordProblems(reveal.record);
    if (problems.length) {
      revealCheck = fail('reasoning_matches', `Revealed record is invalid: ${problems.join('; ')}`);
    } else if (!isHex32(reveal.salt)) {
      revealCheck = fail('reasoning_matches', 'Revealed salt is not 32 bytes of lowercase hex.');
    } else if (!leaf) {
      revealCheck = fail('reasoning_matches', 'No sealed leaf to compare the revealed record with.');
    } else {
      const recomputed = recordLeaf(reveal.record, reveal.salt);
      if (recomputed !== leaf) {
        revealCheck = fail(
          'reasoning_matches',
          `Revealed record hashes to ${recomputed}, not the sealed leaf ${leaf}.`,
        );
      } else if (agent && (reveal.record as DecisionRecord).agentId !== agent.agentId) {
        revealCheck = fail('reasoning_matches', 'Revealed record belongs to a different agent.');
      } else {
        record = reveal.record as DecisionRecord;
        revealCheck = pass('reasoning_matches', 'Revealed record and salt hash exactly to the sealed leaf.');
      }
    }
  }

  // 1. Seal exists
  let sealOk = false;
  if (!leaf) checks.push(fail('seal_exists', 'No fingerprint was sealed for this decision.'));
  else if (!seal) checks.push(fail('seal_exists', 'No Sealed event contains this leaf.'));
  else if (agent && seal.agentId !== agent.agentId)
    checks.push(fail('seal_exists', 'The seal belongs to a different agent.'));
  else if (!verifyProof(leaf, proof, seal.root))
    checks.push(fail('seal_exists', 'The proof does not lead to the sealed root.'));
  else {
    sealOk = true;
    checks.push(pass('seal_exists', `Leaf is in the batch sealed at block ${big(seal.block)}.`));
  }

  // 2. Sequence intact
  if (!seal || !sealOk) checks.push(skip('sequence_intact', 'No valid seal to place the decision in.'));
  else {
    const first = big(seal.firstSeq);
    const count = big(seal.count);
    const claimed = input.seq === undefined || input.seq === null ? null : big(input.seq);
    const seq = record ? BigInt(record.seq) : claimed;
    if (record && claimed !== null && claimed !== BigInt(record.seq)) {
      checks.push(
        fail('sequence_intact', `Claimed seq ${claimed} differs from the record's seq ${record.seq}.`),
      );
    } else if (seq !== null && (seq < first || seq >= first + count)) {
      checks.push(
        fail('sequence_intact', `seq ${seq} is outside the sealed range [${first}, ${first + count}).`),
      );
    } else if (record && input.prevLeaf && record.prev !== input.prevLeaf) {
      checks.push(fail('sequence_intact', 'The record does not chain to the previous leaf.'));
    } else if (count === 1n) {
      checks.push(
        pass('sequence_intact', `Sealed alone as seq ${first}; the on-chain sequence has no gaps.`),
      );
    } else if (record) {
      checks.push(
        pass(
          'sequence_intact',
          `seq ${record.seq} sits inside the sealed range [${first}, ${first + count}).`,
        ),
      );
    } else {
      checks.push(skip('sequence_intact', 'Position inside a batch is proven when the record is revealed.'));
    }
  }

  // 3. Sealed before the trade
  if (!trade) {
    checks.push(
      skip('sealed_before_trade', record?.kind === 'pass' ? 'A pass sends no trade.' : 'No trade is linked.'),
    );
  } else if (record?.kind === 'pass') {
    checks.push(fail('sealed_before_trade', 'A trade is linked to a pass.'));
  } else if (!seal || !sealOk) {
    checks.push(fail('sealed_before_trade', `Trade ${trade.tx} has no valid seal.`));
  } else if (big(trade.block) > big(seal.block)) {
    const gap = big(trade.block) - big(seal.block);
    checks.push(
      pass(
        'sealed_before_trade',
        `Sealed at block ${big(seal.block)}, ${gap} blocks before the trade at ${big(trade.block)}.`,
      ),
    );
  } else {
    checks.push(
      fail(
        'sealed_before_trade',
        `Seal at block ${big(seal.block)} is not before the trade at block ${big(trade.block)}.`,
      ),
    );
  }

  // 4. Reasoning matches
  checks.push(revealCheck);

  // 5. Reasoning recorded (not auto-captured)
  if (!record) checks.push(skip('reasoning_recorded', 'Reasoning is private.'));
  else if (record.autoCaptured)
    checks.push(fail('reasoning_recorded', 'The agent traded without recording its reasoning.'));
  else checks.push(pass('reasoning_recorded', 'The agent recorded its reasoning before acting.'));

  // 6. Wallet bound
  if (!agent) checks.push(skip('wallet_bound', 'Agent registration not supplied.'));
  else if (seal && big(agent.boundBlock) > big(seal.block)) {
    checks.push(fail('wallet_bound', 'The seal is older than the wallet binding.'));
  } else if (trade && trade.from !== agent.wallet) {
    checks.push(
      fail('wallet_bound', `Trade was sent from ${trade.from}, not the bound wallet ${agent.wallet}.`),
    );
  } else
    checks.push(pass('wallet_bound', `Wallet ${agent.wallet} bound since block ${big(agent.boundBlock)}.`));

  // 7. Outcome from chain
  if (!outcome) checks.push(skip('outcome_from_chain', 'No outcome yet.'));
  else
    checks.push(
      pass(
        'outcome_from_chain',
        `Outcome computed from wallet history: ${outcome.pnl} USD (${outcome.pct}).`,
      ),
    );

  return { ok: checks.every((c) => c.status !== 'fail'), checks, record };
}
