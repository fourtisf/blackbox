'use client';
import { useState } from 'react';
import { fetchAdminWaitlist } from '@/lib/api/client';
import type { AdminWaitlist } from '@/lib/api/client';
import { N } from '@/lib/format';
import { Time } from '../time';

/** Waitlist admin. The token stays in this tab's memory only and is sent to the API as a Bearer header. */
export function AdminClient() {
  const [token, setToken] = useState('');
  const [data, setData] = useState<AdminWaitlist | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    setError('');
    try {
      setData((await fetchAdminWaitlist(token)) as AdminWaitlist);
    } catch (e) {
      setError((e as Error).message);
      setData(null);
    } finally {
      setBusy(false);
    }
  };
  const download = async () => {
    try {
      const blob = (await fetchAdminWaitlist(token, 'csv')) as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `blackbox-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      <form
        className="vform"
        style={{ maxWidth: 640 }}
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <label className="sr" htmlFor="adminToken">
          Admin token
        </label>
        <input
          id="adminToken"
          type="password"
          autoComplete="off"
          placeholder="Admin token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <button className="btn btn-p" type="submit" disabled={!token || busy}>
          {busy ? 'Loading…' : data ? 'Refresh' : 'Open'}
        </button>
      </form>
      {error && (
        <p className="wl-error" role="alert" style={{ marginTop: 14 }}>
          {error}
        </p>
      )}
      {data && (
        <>
          <div className="kpis">
            <div>
              Signups<b>{N(data.total)}</b>
            </div>
            <div>
              Confirmed<b>{data.emailConfirmation ? N(data.confirmed) : 'Email off'}</b>
            </div>
            {Object.entries(data.byRole).map(([k, v]) => (
              <div key={k}>
                {k === 'owner' ? 'Run an agent' : k === 'builder' ? 'Build an app' : 'Just curious'}
                <b>{N(v)}</b>
              </div>
            ))}
          </div>
          <div className="d-acts">
            <button className="btn btn-g btn-sm" type="button" onClick={() => void download()}>
              Download CSV
            </button>
          </div>
          <div className="tbl glass" style={{ marginTop: 20 }}>
            <table className="lb" style={{ ['--minw' as string]: '640px' }}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Interest</th>
                  <th>From</th>
                  <th>Joined</th>
                  <th>Confirmed</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.email} style={{ cursor: 'default' }}>
                    <td className="mono" style={{ fontSize: 13 }}>
                      {r.email}
                    </td>
                    <td>{r.role}</td>
                    <td className="t2">{r.source}</td>
                    <td className="t2">
                      <Time t={r.createdAt} f="dateTime" />
                    </td>
                    <td className="t2">{r.confirmedAt ? <Time t={r.confirmedAt} f="date" /> : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="tbl-note">
            Showing the latest {Math.min(200, data.total)} of {N(data.total)}. Sources:{' '}
            {Object.entries(data.bySource)
              .map(([k, v]) => `${k} ${v}`)
              .join(', ')}
            .
          </p>
        </>
      )}
    </div>
  );
}
