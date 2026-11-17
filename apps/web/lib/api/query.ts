import type { AgentListQuery, Period, SortKey } from './types';

/** Parses leaderboard filters from a URL query (shared by the page and the demo API). */
export function parseAgentQuery(sp: URLSearchParams): AgentListQuery {
  const period = Number(sp.get('period'));
  const market = sp.get('market');
  const sort = sp.get('sort');
  return {
    market: market === 'stocks' || market === 'memes' ? market : 'all',
    period: (period === 7 || period === 90 ? period : 30) as Period,
    runtime: sp.get('runtime') ?? undefined,
    q: sp.get('q') ?? undefined,
    sort: (['ret', 'pnl', 'win', 'mdd', 'trades', 'cov', 'trust'].includes(sort ?? '')
      ? sort
      : 'ret') as SortKey,
    dir: sp.get('dir') === 'asc' ? 'asc' : 'desc',
    limit: sp.get('limit') ? Number(sp.get('limit')) : undefined,
    cursor: sp.get('cursor'),
  };
}
