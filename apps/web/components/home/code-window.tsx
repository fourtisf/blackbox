'use client';
import { useState } from 'react';
import { short } from '@/lib/format';

export interface CodeValues {
  agent: string;
  market: string;
  ageDays: number;
  ret30: number;
  mdd: number;
  winRate: number | null;
  sealCov: number;
  trust: number | null;
  wallet: string;
  apiHost: string;
}

export function CodeWindow({ v }: { v: CodeValues }) {
  const [tab, setTab] = useState<'res' | 'req'>('res');
  return (
    <div className="code glass">
      <div className="code-h" role="tablist">
        <button
          className="tab"
          role="tab"
          aria-selected={tab === 'res'}
          type="button"
          onClick={() => setTab('res')}
        >
          Response
        </button>
        <button
          className="tab"
          role="tab"
          aria-selected={tab === 'req'}
          type="button"
          onClick={() => setTab('req')}
        >
          Request
        </button>
        <span className="ep">
          <b>GET</b> /v1/trust/{short(v.wallet)}
        </span>
      </div>
      <pre id="codeRes" hidden={tab !== 'res'}>
        {'{\n  '}
        <span className="k">&quot;agent&quot;</span>: <span className="s">&quot;{v.agent}&quot;</span>,
        {'\n  '}
        <span className="k">&quot;verified&quot;</span>: <span className="b">true</span>,{'\n  '}
        <span className="k">&quot;market&quot;</span>: <span className="s">&quot;{v.market}&quot;</span>,
        {'\n  '}
        <span className="k">&quot;record_age_days&quot;</span>: <span className="n">{v.ageDays}</span>,
        {'\n  '}
        <span className="k">&quot;return_30d&quot;</span>: <span className="n">{v.ret30.toFixed(3)}</span>,
        {'\n  '}
        <span className="k">&quot;max_drawdown&quot;</span>: <span className="n">{v.mdd.toFixed(3)}</span>,
        {'\n  '}
        <span className="k">&quot;win_rate&quot;</span>:{' '}
        <span className="n">{v.winRate === null ? 'null' : v.winRate.toFixed(2)}</span>,{'\n  '}
        <span className="k">&quot;seal_coverage&quot;</span>:{' '}
        <span className="n">{v.sealCov.toFixed(3)}</span>,{'\n  '}
        <span className="k">&quot;trust_score&quot;</span>: <span className="n">{v.trust ?? 'null'}</span>
        {'\n}'}
      </pre>
      <pre id="codeReq" hidden={tab !== 'req'}>
        <span className="c"># one call, priced per check</span>
        {`\ncurl https://${v.apiHost}/v1/trust/${v.wallet} \\\n  -H `}
        <span className="s">&quot;Authorization: Bearer $BLACKBOX_KEY&quot;</span>
        {'\n\n'}
        <span className="c"># or pay per call with x402, no key needed</span>
        {`\ncurl https://${v.apiHost}/v1/trust/${short(v.wallet)} \\\n  -H `}
        <span className="s">&quot;X-Payment: &lt;x402 proof&gt;&quot;</span>
      </pre>
    </div>
  );
}
