import { PROTOCOL_VERSION, recordLeaf } from '@blackbox/protocol';
import vectors from '@blackbox/protocol/vectors.json';

// Placeholder until Milestone 2 ports design/prototype.html. It proves the protocol package
// bundles into the web app by recomputing a golden-vector leaf at build time.
export default function Home() {
  const v = vectors.records[0]!;
  const ok = recordLeaf(v.record, v.salt as `0x${string}`) === v.leaf;
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '120px 24px' }}>
      <h1 style={{ fontSize: 48, letterSpacing: '-0.04em', margin: 0 }}>Blackbox</h1>
      <p style={{ color: '#A2A9BA' }}>The website is built in Milestone 2.</p>
      <p style={{ color: '#666D80', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
        seal protocol v{PROTOCOL_VERSION} · vector leaf {ok ? 'matches' : 'DOES NOT MATCH'}
      </p>
    </main>
  );
}
