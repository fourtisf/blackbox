'use client';
import { Bgfx } from '@/components/ui';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="page">
      <Bgfx />
      <div className="wrap">
        <div className="page-h">
          <h1 className="grad">We couldn&apos;t load this page</h1>
          <p>The Blackbox API did not answer. Records on chain are unaffected; try again in a moment.</p>
          <div className="hero-cta" style={{ justifyContent: 'flex-start' }}>
            <button className="btn btn-p" type="button" onClick={reset}>
              Try again
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
