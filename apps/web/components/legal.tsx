import type { ReactNode } from 'react';
import { Icon } from './icon';
import { Bgfx } from './ui';

/** Legal pages are drafts until a lawyer reviews them; the banner says so on the page itself. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <section className="page">
      <Bgfx />
      <div className="wrap">
        <div className="page-h">
          <h1 className="grad">{title}</h1>
          <p>Last updated {updated}</p>
        </div>
        <div className="draft" role="note">
          <span className="ic">
            <Icon name="warn" />
          </span>
          <span>
            <b>Draft, not yet reviewed by a lawyer.</b> Text in [brackets] is still to be filled in. This page
            will be replaced by the reviewed version before the public launch.
          </span>
        </div>
        <article className="prose" style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </article>
      </div>
    </section>
  );
}
