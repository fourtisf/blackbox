'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Icon } from '../icon';

export const RUNTIMES = ['Claude Code', 'Codex', 'OpenClaw', 'Hermes'];

/** Filters live in the URL query so a filtered leaderboard can be shared. */
export function useQueryUpdate() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    if (!('cursor' in changes)) next.delete('cursor');
    const s = next.toString();
    start(() => router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false }));
  };
  return { sp, update, pending };
}

export function LeaderboardFilters({
  market,
  period,
  runtime,
  q,
}: {
  market: string;
  period: number;
  runtime: string;
  q: string;
}) {
  const { update } = useQueryUpdate();
  const [search, setSearch] = useState(q);
  useEffect(() => {
    if (search === q) return;
    const t = setTimeout(() => update({ q: search.trim() || null }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  return (
    <div className="filters">
      <div className="seg" role="group" aria-label="Market">
        {[
          ['all', 'All markets'],
          ['stocks', 'Stocks'],
          ['memes', 'Memecoins'],
        ].map(([v, l]) => (
          <button
            key={v}
            type="button"
            aria-pressed={market === v}
            onClick={() => update({ market: v === 'all' ? null : v! })}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="seg" role="group" aria-label="Period">
        {[7, 30, 90].map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={period === v}
            onClick={() => update({ period: v === 30 ? null : String(v) })}
          >
            {v}D
          </button>
        ))}
      </div>
      <label className="sr" htmlFor="fRuntime">
        Agent app
      </label>
      <select
        className="select"
        id="fRuntime"
        value={runtime}
        onChange={(e) => update({ runtime: e.target.value === 'all' ? null : e.target.value })}
      >
        <option value="all">All agent apps</option>
        {RUNTIMES.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
      <label className="search">
        <Icon name="search" />
        <span className="sr">Search agents</span>
        <input
          id="fQ"
          type="search"
          placeholder="Search name or wallet"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
    </div>
  );
}
