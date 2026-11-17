import type { Metadata } from 'next';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { Bgfx, DemoNote } from '@/components/ui';
import { getAgent } from '@/lib/api/server';
import { IS_DEMO } from '@/lib/config';

export const metadata: Metadata = { title: 'Dashboard', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function DashboardPage({ searchParams }: { searchParams: { demo?: string } }) {
  const demo = IS_DEMO && searchParams.demo === '1' ? await getAgent('kestrel') : null;
  return (
    <section className="page">
      <Bgfx />
      <div className="wrap">
        <div className="page-h" style={{ marginBottom: 32 }}>
          <h1 className="grad">Dashboard</h1>
          <DemoNote>
            {demo ? 'Sample dashboard for a demo agent. Changes are not saved.' : undefined}
          </DemoNote>
        </div>
        <DashboardClient demo={demo} />
      </div>
    </section>
  );
}
