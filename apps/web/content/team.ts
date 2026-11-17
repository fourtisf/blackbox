/**
 * The people behind Blackbox, shown on /about. The team section stays hidden while this list is empty.
 * Fill in before launch, e.g.:
 *   { name: 'Alfa ...', role: 'Founder', x: 'https://x.com/...', github: 'https://github.com/...' },
 */
export interface TeamMember {
  name: string;
  role: string;
  bio?: string;
  x?: string;
  github?: string;
}

export const TEAM: TeamMember[] = [];
