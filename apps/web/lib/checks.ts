/**
 * Turns protocol verify() results plus the API's verify data into the verifier's copy.
 * Wording follows the prototype; new states (private, late, no reasoning) match its tone.
 */
import { verify } from '@blackbox/protocol';
import type { CheckId, CheckStatus, VerifyResult } from '@blackbox/protocol';
import type { VerifyResponse } from './api/types';
import { N, short } from './format';
import { outcomeView } from './outcome';

export interface CheckItem {
  status: 'ok' | 'no' | 'skip';
  title: string;
  detail: string;
  quote?: string;
}

export interface VerifyView {
  tone: 'ok' | 'warn' | 'no' | 'notfound';
  title: string;
  items: CheckItem[];
}

/** Runs packages/protocol's verify() in the browser on the data the API returned. */
export function runProtocolChecks(res: VerifyResponse): VerifyResult | null {
  if (!res.found) return null;
  return verify({
    leaf: res.decision?.leaf ?? null,
    seq: res.decision?.seq ?? null,
    seal: res.seal ?? null,
    proof: res.proof ?? [],
    agent: res.agent
      ? { agentId: res.agent.agentId, wallet: res.agent.wallet, boundBlock: res.agent.boundBlock }
      : null,
    trade: res.trade ? { tx: res.trade.tx, block: res.trade.block, from: res.trade.from } : null,
    reveal: res.reveal ?? null,
    outcome:
      res.outcome && 'pnl' in res.outcome
        ? { pnl: res.outcome.pnl, pct: 'pct' in res.outcome ? res.outcome.pct : 0 }
        : null,
  });
}

export function buildVerifyView(
  res: VerifyResponse,
  result: VerifyResult | null,
  fmtDate: (iso: string) => string,
): VerifyView {
  if (!res.found || !result || !res.agent)
    return { tone: 'notfound', title: 'No sealed record matches this hash', items: [] };
  const s = Object.fromEntries(result.checks.map((c) => [c.id, c])) as unknown as Record<
    CheckId,
    { status: CheckStatus; detail: string }
  >;
  const a = res.agent;
  const seal = res.seal;
  const trade = res.trade;
  const leaf = res.decision?.leaf;
  const kind = res.decision?.kind ?? trade?.kind;
  const items: CheckItem[] = [];

  // 1. Fingerprint
  if (s.seal_exists.status === 'pass') {
    const others =
      seal!.count > 1 ? `, together with ${seal!.count - 1} other decision${seal!.count > 2 ? 's' : ''}` : '';
    items.push({
      status: 'ok',
      title: 'Fingerprint found on Robinhood Chain',
      detail: `Fingerprint ${short(leaf!)} is sealed in block #${N(seal!.block)}${others}.`,
    });
  } else if (!leaf) {
    items.push({
      status: 'no',
      title: 'No fingerprint for this trade',
      detail: 'The recorder was offline when this trade was sent, so its reasoning was never sealed.',
    });
  } else {
    items.push({ status: 'no', title: 'Fingerprint not found on chain', detail: s.seal_exists.detail });
  }

  // 2. Sequence
  if (s.sequence_intact.status === 'pass') {
    const seq = res.decision!.seq;
    items.push({
      status: 'ok',
      title: 'In sequence',
      detail: `Decision ${N(seq)} sits in the agent’s on-chain sequence, which has no gaps or reordering.`,
    });
  } else if (s.sequence_intact.status === 'fail') {
    items.push({ status: 'no', title: 'Out of sequence', detail: s.sequence_intact.detail });
  }

  // 3. Order against the trade
  const b = s.sealed_before_trade;
  if (b.status === 'pass') {
    items.push({
      status: 'ok',
      title: 'Sealed before the trade',
      detail: `Trade ${short(trade!.tx)} landed in block #${N(trade!.block)}, ${trade!.block - seal!.block} blocks after the seal.`,
    });
  } else if (b.status === 'skip' && kind === 'pass') {
    items.push({
      status: 'ok',
      title: 'Nothing was traded',
      detail: 'This seal records a decision to pass. No transaction followed, and none was needed.',
    });
  } else if (b.status === 'fail' && trade && seal && s.seal_exists.status === 'pass' && kind !== 'pass') {
    items.push({
      status: 'no',
      title: 'Sealed after the trade',
      detail: `The seal landed in block #${N(seal.block)}, ${seal.block - trade.block} blocks after the trade in block #${N(trade.block)}. It counts as unsealed.`,
    });
  } else if (b.status === 'fail' && trade && !leaf) {
    items.push({
      status: 'ok',
      title: 'Trade found on Robinhood Chain',
      detail: `Transaction ${short(trade.tx)} is in block #${N(trade.block)}, sent from ${short(trade.from)}.`,
    });
  } else if (b.status === 'fail') {
    items.push({ status: 'no', title: 'Seal and trade do not line up', detail: b.detail });
  }

  // 4. Reasoning
  const r = s.reasoning_matches;
  if (r.status === 'pass') {
    const text = res.reveal?.record.reasoning ?? '';
    items.push({
      status: 'ok',
      title: 'Reasoning matches the seal',
      detail: 'The owner shared this record, and its fingerprint matches exactly.',
      ...(text ? { quote: text } : {}),
    });
  } else if (r.status === 'fail') {
    items.push({ status: 'no', title: 'Reasoning does not match the seal', detail: r.detail });
  } else if (leaf) {
    items.push({
      status: 'skip',
      title: 'Reasoning private',
      detail:
        'The owner has not revealed this decision yet. Its fingerprint is sealed, so the text can be checked against it the moment it is.',
    });
  }
  if (
    s.reasoning_recorded.status === 'fail' ||
    (res.autoCaptured && s.reasoning_recorded.status === 'skip')
  ) {
    items.push({
      status: 'no',
      title: 'No reasoning recorded',
      detail:
        'The agent traded without calling record_decision, so the recorder captured the trade on its own. It counts as unsealed.',
    });
  }

  // 5. Wallet
  if (s.wallet_bound.status === 'pass') {
    items.push({
      status: 'ok',
      title: 'Wallet bound to the agent',
      detail: `${short(a.wallet)} has been bound to ${a.name} since ${fmtDate(a.recordingSince)}. Every trade it sends counts.`,
    });
  } else if (s.wallet_bound.status === 'fail') {
    items.push({ status: 'no', title: 'Wallet not bound to this agent', detail: s.wallet_bound.detail });
  }

  // 6. Outcome
  if (res.outcome) {
    const o = outcomeView(res.outcome);
    items.push(
      leaf
        ? {
            status: 'ok',
            title: 'Outcome read from the wallet',
            detail: `${o.text}. ${o.sub}. Computed from on-chain balances, not from the log.`,
          }
        : {
            status: 'ok',
            title: 'Still counted in the record',
            detail: `${o.text}. It is part of ${a.name}’s returns and lowers its seal coverage to ${(a.sealCoverage * 100).toFixed(1)}%.`,
          },
    );
  }

  let tone: VerifyView['tone'] = result.ok ? 'ok' : 'no';
  let title = result.ok ? 'Record checks out' : 'Record does not check out';
  if (!leaf && trade) [tone, title] = ['warn', 'Trade found, reasoning not sealed'];
  else if (res.late) [tone, title] = ['warn', 'Trade found, sealed after it landed'];
  else if (res.autoCaptured && s.seal_exists.status === 'pass')
    [tone, title] = ['warn', 'Trade sealed, no reasoning recorded'];
  return { tone, title, items };
}
