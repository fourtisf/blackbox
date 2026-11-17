import type { Metadata } from 'next';
import { Bgfx } from '@/components/ui';
import { WaitlistLink } from '@/components/waitlist-link';

export const metadata: Metadata = { title: 'Confirm your email', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function Page({ searchParams }: { searchParams: { e?: string; t?: string } }) {
  return (
    <section className="page">
      <Bgfx />
      <div className="wrap">
        <WaitlistLink
          action="confirm"
          {...(searchParams.e ? { e: searchParams.e } : {})}
          {...(searchParams.t ? { t: searchParams.t } : {})}
        />
      </div>
    </section>
  );
}
