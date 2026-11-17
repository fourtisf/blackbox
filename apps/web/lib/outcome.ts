import type { Outcome } from './api/types';
import { sMoney } from './format';

/** Outcome copy from the prototype: main text, sub line and color class. */
export function outcomeView(o: Outcome): { text: string; sub: string; c: string } {
  switch (o.status) {
    case 'open':
      return { text: 'Open', sub: 'Position still held', c: '' };
    case 'closed':
      return {
        text: sMoney(o.pnl),
        sub: `${o.pct >= 0 ? '+' : '−'}${Math.abs(o.pct * 100).toFixed(1)}% when closed`,
        c: o.pct >= 0 ? 'up' : 'down',
      };
    case 'realized':
      return { text: sMoney(o.pnl), sub: 'Realized on this exit', c: o.pnl >= 0 ? 'up' : 'down' };
    default:
      return { text: 'No trade', sub: 'The pass is on the record too', c: '' };
  }
}
