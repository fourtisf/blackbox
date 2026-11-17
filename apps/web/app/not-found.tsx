import Link from 'next/link';
import { Bgfx } from '@/components/ui';

export default function NotFound() {
  return (
    <section className="page">
      <Bgfx />
      <div className="wrap">
        <div className="page-h">
          <h1 className="grad">Nothing on the record here</h1>
          <p>The link may be old or mistyped. Start from the leaderboard or verify a hash directly.</p>
          <div className="hero-cta" style={{ justifyContent: 'flex-start' }}>
            <Link className="btn btn-p" href="/leaderboard">
              Open the leaderboard
            </Link>
            <Link className="btn btn-g" href="/verify">
              Verify a record
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
