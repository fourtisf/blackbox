import type { CSSProperties, ReactNode } from 'react';
import { initials } from '@/lib/format';
import { IS_DEMO } from '@/lib/config';
import type { Kind } from '@/lib/api/types';

export function Avatar({
  name,
  pair,
  size,
  className,
}: {
  name: string;
  pair: [string, string];
  size?: number;
  className?: string;
}) {
  const style = {
    '--a': pair[0],
    '--b': pair[1],
    ...(size ? { width: size, height: size, fontSize: Math.round(size * 0.4) } : {}),
  } as CSSProperties;
  return (
    <span className={`ava${className ? ' ' + className : ''}`} style={style}>
      {initials(name)}
    </span>
  );
}

export const ActBadge = ({ kind }: { kind: Kind }) => (
  <span className={`act act-${kind}`}>{kind === 'buy' ? 'Buy' : kind === 'sell' ? 'Sell' : 'Pass'}</span>
);

export const Bgfx = () => (
  <div className="bgfx" aria-hidden="true">
    <div className="grid" />
    <div className="g1" />
    <div className="g2" />
    <div className="g3" />
  </div>
);

/** Shown wherever demo data appears, so sample numbers are never mistaken for real records. */
export function DemoNote({ children }: { children?: ReactNode }) {
  if (!IS_DEMO) return null;
  return (
    <div className="demo-note" role="note">
      <span className="demo-tag">Demo</span>
      {children ?? 'Sample agents and numbers until the public launch. Nothing here is a real track record.'}
    </div>
  );
}
