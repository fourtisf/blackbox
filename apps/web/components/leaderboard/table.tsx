'use client';
import { useRouter } from 'next/navigation';
import type { AgentListItem, SortKey } from '@/lib/api/types';
import { cls, covText, marketName, pct, pctPlain, short, sMoney, N } from '@/lib/format';
import { Spark } from '../charts';
import { Avatar } from '../ui';
import { useQueryUpdate } from './filters';

const COLS: [string, string, string, SortKey | null][] = [
  ['rank', '#', '', null],
  ['name', 'Agent', '', null],
  ['market', 'Market', 'hm', null],
  ['rt', 'Runs on', 'hm', null],
  ['ret', 'Return', 'r', 'ret'],
  ['pnl', 'Profit', 'r hm', 'pnl'],
  ['win', 'Win rate', 'r hm', 'win'],
  ['mdd', 'Drawdown', 'r hm', 'mdd'],
  ['trades', 'Trades', 'r hm', 'trades'],
  ['cov', 'Sealed', 'r hm', 'cov'],
  ['trust', 'Trust', 'r hm', 'trust'],
  ['trend', '30D trend', 'r hm', null],
];

export function LeaderboardTable({
  rows,
  sort,
  dir,
}: {
  rows: AgentListItem[];
  sort: SortKey;
  dir: 'asc' | 'desc';
}) {
  const router = useRouter();
  const { update, pending } = useQueryUpdate();
  const go = (slug: string) => router.push(`/agent/${slug}`);
  const onSort = (k: SortKey) =>
    update(
      sort === k
        ? { sort: k === 'ret' ? null : k, dir: dir === 'desc' ? 'asc' : null }
        : { sort: k === 'ret' ? null : k, dir: null },
    );
  return (
    <div className="tbl glass" style={pending ? { opacity: 0.6, transition: 'opacity .2s' } : undefined}>
      <table className="lb" style={{ ['--minw' as string]: '1090px' }}>
        <thead>
          <tr>
            {COLS.map(([k, l, c, s]) =>
              s ? (
                <th
                  key={k}
                  className={c}
                  aria-sort={sort === s ? (dir === 'desc' ? 'descending' : 'ascending') : undefined}
                >
                  <button type="button" onClick={() => onSort(s)}>
                    {l}
                    <span className="arr">{dir === 'desc' ? '▼' : '▲'}</span>
                  </button>
                </th>
              ) : (
                <th key={k} className={c}>
                  {l}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={COLS.length} style={{ border: 0 }}>
                <div className="empty">
                  <b>No agents match</b>Clear the search or pick all agent apps to see the full list.
                </div>
              </td>
            </tr>
          ) : (
            rows.map((a) => (
              <tr
                key={a.slug}
                tabIndex={0}
                data-agent={a.slug}
                onClick={() => go(a.slug)}
                onKeyDown={(e) => e.key === 'Enter' && go(a.slug)}
              >
                <td className="rank">{String(a.rank).padStart(2, '0')}</td>
                <td>
                  <div className="ag">
                    <Avatar name={a.name} pair={a.avatar} />
                    <div>
                      <b>{a.name}</b>
                      <small>{short(a.wallet)}</small>
                    </div>
                  </div>
                </td>
                <td className="hm">
                  <span className="mkp">{marketName(a.market)}</span>
                </td>
                <td className="rtc hm">
                  <b>{a.runtime}</b>
                  <small>{a.model}</small>
                </td>
                <td className={`r ${cls(a.ret)}`} style={{ fontWeight: 550 }}>
                  {pct(a.ret)}
                </td>
                <td className={`r hm ${cls(a.pnl)}`}>{sMoney(a.pnl)}</td>
                <td className="r hm">{a.winRate === null ? '–' : pctPlain(a.winRate)}</td>
                <td className="r hm t2">{pct(a.maxDrawdown)}</td>
                <td className="r hm t2">{N(a.trades30d)}</td>
                <td className="r hm">
                  <span className="cov">
                    <i style={{ ['--w' as string]: `${a.sealCoverage * 100}%` }} />
                    {covText(a.sealCoverage)}
                  </span>
                </td>
                <td className="r hm trust">
                  {a.trustScore === null ? <span className="new">New</span> : a.trustScore}
                </td>
                <td className="r hm">
                  <Spark series={a.spark30d} w={80} h={28} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({
  total,
  shown,
  offset,
  nextCursor,
  limit,
}: {
  total: number;
  shown: number;
  offset: number;
  nextCursor: string | null;
  limit: number;
}) {
  const { update } = useQueryUpdate();
  if (total <= limit && offset === 0) return null;
  return (
    <div className="pager">
      <span>
        Showing {offset + 1}–{offset + shown} of {total}
      </span>
      <span style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn btn-g btn-sm"
          type="button"
          aria-disabled={offset === 0}
          onClick={() => update({ cursor: offset - limit > 0 ? String(offset - limit) : null })}
        >
          Previous
        </button>
        <button
          className="btn btn-g btn-sm"
          type="button"
          aria-disabled={!nextCursor}
          onClick={() => nextCursor && update({ cursor: nextCursor })}
        >
          Next
        </button>
      </span>
    </div>
  );
}
