import { ICONS, MARKET_ICONS } from './icon-data';
import type { IconName } from './icon-data';

/**
 * Renders a prototype icon. `display: contents` makes the wrapper vanish from layout,
 * so the SVG sits exactly where it did in the prototype markup.
 */
export function Icon({ name }: { name: IconName }) {
  return <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: ICONS[name] }} />;
}

export function MarketIcon({ name }: { name: keyof typeof MARKET_ICONS }) {
  return <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: MARKET_ICONS[name] }} />;
}
