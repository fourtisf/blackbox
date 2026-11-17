import { Bgfx } from '@/components/ui';

export default function Loading() {
  return (
    <section className="page" aria-busy="true">
      <Bgfx />
      <div className="wrap">
        <div className="ah glass">
          <div className="skel" style={{ width: 76, height: 76, borderRadius: '50%' }} />
          <div style={{ flex: 1, display: 'grid', gap: 10 }}>
            <div className="skel" style={{ height: 40, maxWidth: 280 }} />
            <div className="skel" style={{ height: 24, maxWidth: 220 }} />
          </div>
        </div>
        <div className="stats">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="stat glass">
              <div className="skel" style={{ height: 60 }} />
            </div>
          ))}
        </div>
        <div className="glass" style={{ marginTop: 16, height: 380 }} />
        <span className="sr">Loading the agent</span>
      </div>
    </section>
  );
}
