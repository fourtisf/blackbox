import type { ReactNode } from 'react';
import { EXPLORER_URL } from '@/lib/config';

/** Links a transaction or block to the explorer when one is configured (real chain data only). */
export function TxLink({
  hash,
  children,
  className,
}: {
  hash: string;
  children: ReactNode;
  className?: string;
}) {
  if (!EXPLORER_URL) return <span className={className}>{children}</span>;
  return (
    <a
      className={`xlink${className ? ' ' + className : ''}`}
      href={`${EXPLORER_URL}/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  );
}

export function BlockLink({
  block,
  children,
  className,
}: {
  block: number;
  children: ReactNode;
  className?: string;
}) {
  if (!EXPLORER_URL) return <span className={className}>{children}</span>;
  return (
    <a
      className={`xlink${className ? ' ' + className : ''}`}
      href={`${EXPLORER_URL}/block/${block}`}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  );
}
