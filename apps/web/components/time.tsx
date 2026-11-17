'use client';
import { useEffect, useState } from 'react';
import { fmtTime } from '@/lib/format';
import type { TimeFormat } from '@/lib/format';

/** Renders UTC on the server, then the visitor's local time after hydration. */
export function Time({ t, f }: { t: number | string; f: TimeFormat }) {
  const ms = typeof t === 'string' ? Date.parse(t) : t;
  const [tz, setTz] = useState<string | undefined>('UTC');
  useEffect(() => setTz(undefined), []);
  return (
    <time dateTime={new Date(ms).toISOString()} suppressHydrationWarning>
      {fmtTime(ms, f, tz)}
    </time>
  );
}
