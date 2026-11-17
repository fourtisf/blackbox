'use client';
import { recordLeaf } from '@blackbox/protocol';
import type { DecisionRecord, Hex } from '@blackbox/protocol';
import { useMemo, useState } from 'react';
import { IS_DEMO } from '@/lib/config';
import { N } from '@/lib/format';
import { Icon } from '../icon';

/**
 * "Try to rewrite it": the real protocol in the browser. Editing the reasoning recomputes the leaf
 * with the published salt and compares it with the sealed leaf.
 */
export function RewriteDemo({
  record,
  salt,
  leaf,
  sealBlock,
  agentName,
}: {
  record: DecisionRecord;
  salt: Hex;
  leaf: Hex;
  sealBlock: number;
  agentName: string;
}) {
  const [text, setText] = useState(record.reasoning);
  const yours = useMemo(() => {
    try {
      return recordLeaf({ ...record, reasoning: text }, salt);
    } catch {
      return null; // e.g. empty reasoning is not a valid record
    }
  }, [record, salt, text]);
  const ok = yours === leaf;
  return (
    <div className="try glass glow-border">
      <div className="hd">
        <div>
          <b>Try to rewrite it</b>
          <small>
            {agentName}&apos;s {IS_DEMO ? '' : 'real '}reasoning, sealed in block #{N(sealBlock)}. Change any
            word.
          </small>
        </div>
        <button className="btn btn-g btn-sm" type="button" onClick={() => setText(record.reasoning)}>
          Reset
        </button>
      </div>
      <label className="sr" htmlFor="tText">
        Agent reasoning
      </label>
      <textarea id="tText" spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="fp">
        <span className="t3">Sealed</span>
        <span className="mono sealed">{leaf}</span>
        <span className="t3">Your version</span>
        <span className="mono" id="tHash">
          {yours ?? 'Not a valid record'}
        </span>
      </div>
      <div className={`verdict ${ok ? 'ok' : 'no'}`} id="tVerdict" aria-live="polite">
        {ok ? (
          <>
            <span className="ic">
              <Icon name="check" />
            </span>
            Matches the seal in block #{N(sealBlock)}
            <span className="t2">Untouched</span>
          </>
        ) : (
          <>
            <span className="ic">
              <Icon name="x" />
            </span>
            No seal matches this version<span className="t2">The edit would be caught</span>
          </>
        )}
      </div>
    </div>
  );
}
