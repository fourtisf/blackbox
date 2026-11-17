import type { ReactNode } from 'react';
import { INSTALL_COMMAND, RECORDER_PUBLISHED } from '@/lib/config';

/** Copies the install command once the recorder is published; until then it opens the waitlist. */
export function InstallButton({
  className,
  children,
  source,
}: {
  className: string;
  children: ReactNode;
  source: string;
}) {
  return RECORDER_PUBLISHED ? (
    <button className={className} type="button" data-copy={INSTALL_COMMAND}>
      {children}
    </button>
  ) : (
    <button className={className} type="button" data-waitlist={source}>
      {children}
    </button>
  );
}

/** The `$ npx …` chip from the hero. */
export function CopyChip() {
  return (
    <span className="chip-copy">
      $ <b>{INSTALL_COMMAND}</b>
      {RECORDER_PUBLISHED ? (
        <button type="button" data-copy={INSTALL_COMMAND}>
          Copy
        </button>
      ) : (
        <button type="button" data-waitlist="install-chip">
          Notify me
        </button>
      )}
    </span>
  );
}
