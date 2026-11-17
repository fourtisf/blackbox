import { Bgfx } from '@/components/ui';

export default function Loading() {
  return (
    <section className="page" aria-busy="true">
      <Bgfx />
      <div className="wrap">
        <div className="page-h">
          <h1 className="grad">Verified agents</h1>
          <div className="skel" style={{ height: 22, maxWidth: 560, marginTop: 18 }} />
        </div>
        <div className="tbl glass" style={{ marginTop: 48, padding: 20, display: 'grid', gap: 12 }}>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="skel" style={{ height: 44 }} />
          ))}
        </div>
        <span className="sr">Loading the leaderboard</span>
      </div>
    </section>
  );
}
