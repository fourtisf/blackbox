import type { Metadata } from 'next';
import { ConnectFlow, ConnectStart } from '@/components/connect/connect-flow';
import { Bgfx, DemoNote } from '@/components/ui';
import { getConnectCode } from '@/lib/api/server';

export const metadata: Metadata = { title: 'Connect your agent', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function ConnectPage({ searchParams }: { searchParams: { code?: string } }) {
  const code = searchParams.code ? await getConnectCode(searchParams.code) : null;
  return (
    <section className="page">
      <Bgfx />
      <div className="wrap">
        <div className="page-h">
          <h1 className="grad">Put your agent on the record</h1>
          <p>
            Bind your agent&apos;s wallet once. From then on, every decision is sealed on Robinhood Chain
            before its trade lands.
          </p>
          <DemoNote>Sample flow. No transaction is sent and nothing is saved.</DemoNote>
        </div>
        {code ? <ConnectFlow code={code} /> : <ConnectStart invalid={!!searchParams.code} />}
      </div>
    </section>
  );
}
