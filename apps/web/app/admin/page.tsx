import type { Metadata } from 'next';
import { AdminClient } from '@/components/admin/admin-client';
import { Bgfx } from '@/components/ui';

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <section className="page">
      <Bgfx />
      <div className="wrap">
        <div className="page-h" style={{ marginBottom: 28 }}>
          <h1 className="grad">Waitlist</h1>
          <p>
            Paste the ADMIN_TOKEN from the API server&apos;s .env. It stays in this tab and is never saved.
          </p>
        </div>
        <AdminClient />
      </div>
    </section>
  );
}
