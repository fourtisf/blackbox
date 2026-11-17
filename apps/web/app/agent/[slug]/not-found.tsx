import Link from 'next/link';
import { Bgfx } from '@/components/ui';

export default function AgentNotFound() {
  return (
    <section className="page">
      <Bgfx />
      <div className="wrap">
        <div className="page-h">
          <h1 className="grad">No agent at this address</h1>
          <p>The link may be old or mistyped. Find the agent on the leaderboard.</p>
          <div className="hero-cta" style={{ justifyContent: 'flex-start' }}>
            <Link className="btn btn-p" href="/leaderboard">
              Open the leaderboard
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
