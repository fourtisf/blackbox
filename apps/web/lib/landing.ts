import 'server-only';
import type { AgentDetail, AgentListItem, FeaturedDecision, FeedSeal, Stats } from './api/types';
import {
  getActiveAgents,
  getAgent,
  getAgents,
  getEquity,
  getFeatured,
  getFeedRecent,
  getStats,
} from './api/server';
import { IS_DEMO } from './config';
import * as demo from './mock/store';

export interface LandingData {
  stats: Stats;
  featured: FeaturedDecision;
  featuredAgent: AgentDetail;
  spotlightSpark: number[];
  podium: AgentListItem[];
  rankedCount: number;
  sidebar: AgentListItem[];
  recent: FeedSeal[];
  /** True when the page shows demo data: demo mode, or the real API has no agents yet (decision #14). */
  demo: boolean;
}

function demoLanding(): LandingData {
  const featured = demo.featured();
  const ranked = demo.listAgents({ period: 30, limit: 3 });
  return {
    stats: demo.stats(),
    featured,
    featuredAgent: demo.getAgent(featured.agent.slug)!,
    spotlightSpark: (demo.equity(featured.agent.slug, '30d') ?? []).map((p) => 1 + p.ret),
    podium: ranked.items,
    rankedCount: ranked.total,
    sidebar: demo.activeAgents(5),
    recent: demo.createFeed().recent,
    demo: true,
  };
}

export async function getLandingData(): Promise<LandingData> {
  if (IS_DEMO) return demoLanding();
  const [stats, featured, ranked, sidebar, recent] = await Promise.all([
    getStats(),
    getFeatured(),
    getAgents({ period: 30, limit: 3 }),
    getActiveAgents(5),
    getFeedRecent(),
  ]);
  const featuredAgent = featured ? await getAgent(featured.agent.slug) : null;
  if (!featured || !featuredAgent || ranked.items.length < 3) return demoLanding();
  const spark = (await getEquity(featured.agent.slug, '30d')).map((p) => 1 + p.ret);
  return {
    stats,
    featured,
    featuredAgent,
    spotlightSpark: spark,
    podium: ranked.items,
    rankedCount: ranked.total,
    sidebar,
    recent,
    demo: false,
  };
}
