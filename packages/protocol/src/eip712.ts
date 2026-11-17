import { addressWord, concatBytes, hexToBytes, uintWord, utf8 } from './bytes.js';
import type { Address, Hex } from './bytes.js';
import { keccak256 } from './hash.js';

/** EIP-712 domain of SealRegistry. */
export const SEAL_DOMAIN_NAME = 'Blackbox SealRegistry';
export const SEAL_DOMAIN_VERSION = '1';

/** Typed-data definition for wallets and signing libraries (e.g. viem signTypedData). */
export const SEAL_REQUEST_TYPES = {
  SealRequest: [
    { name: 'agentId', type: 'bytes32' },
    { name: 'root', type: 'bytes32' },
    { name: 'firstSeq', type: 'uint64' },
    { name: 'count', type: 'uint32' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;

export interface SealRequest {
  agentId: Hex;
  root: Hex;
  firstSeq: bigint | number;
  count: bigint | number;
  deadline: bigint | number;
}

const DOMAIN_TYPEHASH = keccak256(
  utf8('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
);
const SEAL_TYPEHASH = keccak256(
  utf8('SealRequest(bytes32 agentId,bytes32 root,uint64 firstSeq,uint32 count,uint256 deadline)'),
);

export function sealDomainSeparator(chainId: bigint | number, verifyingContract: Address): Hex {
  return keccak256(
    concatBytes(
      hexToBytes(DOMAIN_TYPEHASH),
      hexToBytes(keccak256(utf8(SEAL_DOMAIN_NAME))),
      hexToBytes(keccak256(utf8(SEAL_DOMAIN_VERSION))),
      uintWord(chainId),
      addressWord(verifyingContract),
    ),
  );
}

function checkUint(value: bigint | number, bits: number, name: string): void {
  const v = BigInt(value);
  if (v < 0n || v >= 1n << BigInt(bits)) throw new RangeError(`${name} does not fit in uint${bits}`);
}

/** The digest the sealer key signs for SealRegistry.sealBySig. */
export function sealRequestDigest(
  chainId: bigint | number,
  verifyingContract: Address,
  req: SealRequest,
): Hex {
  checkUint(req.firstSeq, 64, 'firstSeq');
  checkUint(req.count, 32, 'count');
  checkUint(req.deadline, 256, 'deadline');
  const structHash = keccak256(
    concatBytes(
      hexToBytes(SEAL_TYPEHASH),
      hexToBytes(req.agentId, 32),
      hexToBytes(req.root, 32),
      uintWord(req.firstSeq),
      uintWord(req.count),
      uintWord(req.deadline),
    ),
  );
  return keccak256(
    concatBytes(
      Uint8Array.of(0x19, 0x01),
      hexToBytes(sealDomainSeparator(chainId, verifyingContract)),
      hexToBytes(structHash),
    ),
  );
}
