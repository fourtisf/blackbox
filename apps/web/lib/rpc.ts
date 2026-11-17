/**
 * Re-reads a Sealed log straight from the chain, so the verifier does not have to trust our API.
 * Plain JSON-RPC (eth_getLogs); the event signature hash comes from packages/protocol's keccak.
 */
import { keccak256, utf8 } from '@blackbox/protocol';
import type { Address, Hex } from '@blackbox/protocol';

export const SEALED_TOPIC = keccak256(utf8('Sealed(bytes32,bytes32,uint64,uint32)'));

export interface SealedLog {
  root: Hex;
  firstSeq: number;
  count: number;
  block: number;
}

/** Decodes the non-indexed data of Sealed(bytes32 indexed agentId, bytes32 root, uint64 firstSeq, uint32 count). */
export function decodeSealedData(data: string, block: number): SealedLog {
  const words = data.replace(/^0x/, '').match(/.{64}/g) ?? [];
  if (words.length !== 3) throw new Error('Unexpected Sealed log data');
  return {
    root: `0x${words[0]}` as Hex,
    firstSeq: Number(BigInt(`0x${words[1]}`)),
    count: Number(BigInt(`0x${words[2]}`)),
    block,
  };
}

export async function fetchSealedLogs(
  rpcUrl: string,
  sealRegistry: Address,
  agentId: Hex,
  block: number,
): Promise<SealedLog[]> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getLogs',
      params: [
        {
          address: sealRegistry,
          fromBlock: `0x${block.toString(16)}`,
          toBlock: `0x${block.toString(16)}`,
          topics: [SEALED_TOPIC, agentId],
        },
      ],
    }),
  });
  const body = (await res.json()) as {
    result?: { data: string; blockNumber: string }[];
    error?: { message: string };
  };
  if (body.error || !body.result) throw new Error(body.error?.message ?? 'RPC error');
  return body.result.map((l) => decodeSealedData(l.data, Number(BigInt(l.blockNumber))));
}

/** True when the chain holds exactly the seal the API described. */
export async function recheckSeal(
  rpcUrl: string,
  sealRegistry: Address,
  seal: { agentId: Hex; root: Hex; firstSeq: number; count: number; block: number },
): Promise<boolean> {
  const logs = await fetchSealedLogs(rpcUrl, sealRegistry, seal.agentId, seal.block);
  return logs.some((l) => l.root === seal.root && l.firstSeq === seal.firstSeq && l.count === seal.count);
}
