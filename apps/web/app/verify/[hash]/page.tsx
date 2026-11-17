import type { Metadata } from 'next';
import { Bgfx } from '@/components/ui';
import { VerifyClient } from '@/components/verify/verify-client';
import { getVerify, getVerifyExamples } from '@/lib/api/server';

export const metadata: Metadata = { title: 'Verify a record' };
export const dynamic = 'force-dynamic';

export default async function VerifyHashPage({ params }: { params: { hash: string } }) {
  const hash = decodeURIComponent(params.hash);
  const [examples, initial] = await Promise.all([getVerifyExamples(), getVerify(hash)]);
  return (
    <section className="page">
      <Bgfx />
      <div className="wrap">
        <VerifyClient initialHash={hash} initial={initial} examples={examples} />
      </div>
    </section>
  );
}
