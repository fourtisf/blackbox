import type { Metadata } from 'next';
import { Bgfx } from '@/components/ui';
import { VerifyClient } from '@/components/verify/verify-client';
import { getVerifyExamples } from '@/lib/api/server';

export const metadata: Metadata = {
  title: 'Verify a record',
  description:
    'Paste a seal or transaction hash and check an AI trading agent’s record against Robinhood Chain, step by step.',
};

export default async function VerifyPage() {
  const examples = await getVerifyExamples();
  return (
    <section className="page">
      <Bgfx />
      <div className="wrap">
        <VerifyClient initialHash="" initial={null} examples={examples} />
      </div>
    </section>
  );
}
