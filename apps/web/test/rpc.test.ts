import { keccak256, utf8 } from '@blackbox/protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodeSealedData, recheckSeal, SEALED_TOPIC } from '@/lib/rpc';

const word = (n: bigint | string) =>
  typeof n === 'string' ? n.replace(/^0x/, '') : n.toString(16).padStart(64, '0');
const root = keccak256(utf8('root'));
const agentId = keccak256(utf8('agent'));
const data = '0x' + word(root) + word(1842n) + word(4n);

describe('Sealed log re-check over RPC', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses the Sealed(bytes32,bytes32,uint64,uint32) topic', () => {
    expect(SEALED_TOPIC).toBe(keccak256(utf8('Sealed(bytes32,bytes32,uint64,uint32)')));
  });

  it('decodes root, firstSeq and count', () => {
    expect(decodeSealedData(data, 115040420)).toEqual({ root, firstSeq: 1842, count: 4, block: 115040420 });
    expect(() => decodeSealedData('0x1234', 1)).toThrow();
  });

  it('asks for the agent’s logs in exactly the seal block and compares them', async () => {
    const fetchMock = vi.fn(async () => ({
      json: async () => ({ result: [{ data, blockNumber: '0x6db6a64' }] }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const seal = { agentId, root, firstSeq: 1842, count: 4, block: 0x6db6a64 };
    await expect(
      recheckSeal('https://rpc.example', '0x5ea1000000000000000000000000000000000001', seal),
    ).resolves.toBe(true);
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(body.params[0]).toMatchObject({
      fromBlock: '0x6db6a64',
      toBlock: '0x6db6a64',
      topics: [SEALED_TOPIC, agentId],
    });
    await expect(
      recheckSeal('https://rpc.example', '0x5ea1000000000000000000000000000000000001', { ...seal, count: 5 }),
    ).resolves.toBe(false);
  });
});
