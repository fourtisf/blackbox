import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { recordLeaf, verify, verifyProof } from '@blackbox/protocol';
import type { CheckId, CheckStatus, Hex } from '@blackbox/protocol';
import { beforeAll, describe, expect, it } from 'vitest';
import { genAgents, genDecisions } from '@/lib/mock/generator';
import {
  createFeed,
  decisions,
  equity,
  featured,
  getAgent,
  getStore,
  listAgents,
  resetStore,
  verifyExamples,
  verifyLookup,
} from '@/lib/mock/store';
import type { VerifyResponse } from '@/lib/api/types';

const NOW = 1_763_380_000_000;

/** Runs the generator code straight out of design/prototype.html. */
function prototypeGenerator(now: number) {
  const html = readFileSync(new URL('../../../design/prototype.html', import.meta.url), 'utf8');
  const code = html.slice(
    html.indexOf('/* ---------- utils ---------- */'),
    html.indexOf('/* ---------- shared ---------- */'),
  );
  class FixedDate extends Date {
    static override now() {
      return now;
    }
  }
  const sandbox = {
    Date: FixedDate,
    performance: { now: () => 0 },
    Math,
    Object,
    String,
    Number,
    JSON,
    result: null,
  };
  vm.runInNewContext(`${code}\nresult = { agents, decisions };`, sandbox);
  return sandbox.result as unknown as {
    agents: Record<string, unknown>[];
    decisions: (a: unknown) => Record<string, unknown>[];
  };
}

describe('demo generator matches design/prototype.html exactly', () => {
  const proto = prototypeGenerator(NOW);
  const ours = genAgents(NOW);

  it('same 16 agents with identical numbers', () => {
    for (let i = 0; i < 16; i++) {
      const p = proto.agents[i]!;
      const o = ours[i]!;
      for (const key of [
        'id',
        'name',
        'market',
        'runtime',
        'model',
        'age',
        'mdd',
        'vault',
        'winRate',
        'trades30',
        'sealCov',
        'owner',
      ]) {
        expect(o[key as keyof typeof o], `${o.name}.${key}`).toEqual(p[key]);
      }
      expect(o.series).toEqual(p.series);
    }
  });

  it('same decisions for every agent', () => {
    for (let i = 0; i < 16; i++) {
      const pd = proto.decisions(proto.agents[i]);
      const od = genDecisions(ours[i]!, NOW);
      expect(od.map((d) => [d.kind, d.asset, d.reason, d.t, d.cBlock, d.tBlock])).toEqual(
        pd.map((d) => [d.kind, d.asset, d.reason, d.t, d.cBlock, d.tBlock]),
      );
    }
  });
});

describe('demo dataset', () => {
  beforeAll(() => resetStore());

  it('every visible record hashes to its leaf and every leaf proves into its sealed root', () => {
    const s = getStore();
    let checked = 0;
    for (const a of s.agents) {
      for (const d of decisions(a.gen.id)!) {
        if (!d.leaf) continue;
        const v = verifyLookup(d.leaf);
        expect(v.found).toBe(true);
        expect(verifyProof(d.leaf, v.proof!, v.seal!.root)).toBe(true);
        if (v.reveal) expect(recordLeaf(v.reveal.record, v.reveal.salt)).toBe(d.leaf);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(400);
  });

  const run = (v: VerifyResponse) => {
    const r = verify({
      leaf: v.decision?.leaf ?? null,
      seq: v.decision?.seq ?? null,
      seal: v.seal ?? null,
      proof: v.proof ?? [],
      agent: v.agent
        ? { agentId: v.agent.agentId, wallet: v.agent.wallet, boundBlock: v.agent.boundBlock }
        : null,
      trade: v.trade ? { tx: v.trade.tx, block: v.trade.block, from: v.trade.from } : null,
      reveal: v.reveal ?? null,
    });
    return {
      ok: r.ok,
      s: Object.fromEntries(r.checks.map((c) => [c.id, c.status])) as Record<CheckId, CheckStatus>,
    };
  };

  it('has an example of every verify outcome, each with the expected checks', () => {
    const ex = Object.fromEntries(verifyExamples().map((e) => [e.label, e.hash]));
    expect(Object.keys(ex)).toEqual([
      'Sealed trade',
      'Sealed pass',
      'Unsealed trade',
      'Late seal',
      'No reasoning',
    ]);

    expect(run(verifyLookup(ex['Sealed trade']!))).toMatchObject({
      ok: true,
      s: { seal_exists: 'pass', sealed_before_trade: 'pass', reasoning_matches: 'pass' },
    });
    expect(run(verifyLookup(ex['Sealed pass']!))).toMatchObject({
      ok: true,
      s: { seal_exists: 'pass', sealed_before_trade: 'skip' },
    });
    expect(run(verifyLookup(ex['Unsealed trade']!))).toMatchObject({ ok: false, s: { seal_exists: 'fail' } });
    expect(run(verifyLookup(ex['Late seal']!))).toMatchObject({
      ok: false,
      s: { seal_exists: 'pass', sealed_before_trade: 'fail' },
    });
    expect(run(verifyLookup(ex['No reasoning']!))).toMatchObject({
      ok: false,
      s: { reasoning_matches: 'pass', reasoning_recorded: 'fail' },
    });
  });

  it('private agents reveal nothing; passes inside batches need the reveal to prove position', () => {
    const heron = decisions('night-heron')!;
    expect(heron.every((d) => !d.revealed && d.reasoning === undefined)).toBe(true);
    const batched = getStore()
      .agents.flatMap((a) => decisions(a.gen.id)!)
      .find((d) => d.leaf && d.kind === 'pass' && verifyLookup(d.leaf).seal!.count > 1 && !d.revealed);
    if (batched) expect(run(verifyLookup(batched.leaf!)).s.sequence_intact).toBe('skip');
  });

  it('reports the hidden records as a sequence gap', () => {
    const pike = getAgent('pike-and-reed')!;
    expect(pike.sequenceGaps).toHaveLength(1);
    const { from, to } = pike.sequenceGaps[0]!;
    const seqs = decisions('pike-and-reed')!.map((d) => d.seq);
    for (let s = from; s <= to; s++) expect(seqs).not.toContain(s);
  });

  it('new agents: Wren is ranked but "New", Sable Flux is not ranked yet', () => {
    const wren = getAgent('wren')!;
    expect(wren).toMatchObject({ eligible: true, trustScore: null, winRate: null });
    const sable = getAgent('sable-flux')!;
    expect(sable.eligible).toBe(false);
    expect(sable.ineligibleReasons.join(' ')).toMatch(/Ranking starts at 7 days/);
    expect(listAgents({ limit: 100 }).items.map((a) => a.slug)).not.toContain('sable-flux');
  });

  it('leaderboard pages, filters and keeps rank independent of the sort', () => {
    const all = listAgents({ limit: 100 });
    const p1 = listAgents({ limit: 5 });
    const p2 = listAgents({ limit: 5, cursor: p1.nextCursor });
    expect(p1.items).toHaveLength(5);
    expect(p1.total).toBe(all.total);
    expect(p2.items[0]!.slug).toBe(all.items[5]!.slug);
    expect(all.items.map((a) => a.rank)).toEqual(all.items.map((_, i) => i + 1));
    const byCov = listAgents({ sort: 'cov', dir: 'asc', limit: 100 });
    expect(new Set(byCov.items.map((a) => a.rank))).toEqual(new Set(all.items.map((a) => a.rank)));
    expect(listAgents({ market: 'memes', limit: 100 }).items.every((a) => a.market === 'memes')).toBe(true);
    expect(listAgents({ q: 'kest' }).items.map((a) => a.name)).toEqual(['Kestrel']);
  });

  it('featured decision is a revealed, sealed, profitable Kestrel buy', () => {
    const f = featured();
    expect(f.agent.slug).toBe('kestrel');
    expect(f.decision).toMatchObject({ kind: 'buy', sealed: true, revealed: true });
    expect(recordLeaf(f.record, f.salt)).toBe(f.leaf);
    expect(f.timeline).toHaveLength(23);
    expect(f.timeline[11]!.leaf).toBe(f.leaf);
  });

  it('equity and the live feed have the expected shape', () => {
    expect(equity('kestrel', '30d')).toHaveLength(31);
    expect(equity('kestrel', '30d')![0]!.ret).toBe(0);
    const feed = createFeed();
    expect(feed.recent).toHaveLength(7);
    expect(feed.next().sealBlock).toBeGreaterThan(0);
  });

  it('a hash that does not exist is not found', () => {
    expect(verifyLookup('0x1234').found).toBe(false);
    expect(verifyLookup(('0x' + 'ab'.repeat(32)) as Hex).found).toBe(false);
  });
});
