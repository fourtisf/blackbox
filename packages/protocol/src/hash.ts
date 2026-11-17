import { keccak_256 } from '@noble/hashes/sha3.js';
import { randomBytes } from '@noble/hashes/utils.js';
import { addressWord, bytesToHex, concatBytes, hexToBytes, uintWord, utf8 } from './bytes.js';
import type { Address, Hex } from './bytes.js';
import { canonicalize } from './canonical.js';
import type { JsonValue } from './canonical.js';
import { assertDecisionRecord } from './record.js';

/** Domain prefixes keep leaves, interior nodes and tool hashes from ever colliding. */
export const LEAF_PREFIX = 0x00;
export const NODE_PREFIX = 0x01;
export const TOOL_PREFIX = 0x02;

export const keccak256 = (data: Uint8Array): Hex => bytesToHex(keccak_256(data));

/** 32 random bytes from the platform CSPRNG (Web Crypto). Generated locally, kept locally. */
export const newSalt = (): Hex => bytesToHex(randomBytes(32));

/** recordHash = keccak256(utf8(JCS(record))). Throws RecordError if the record is not a valid v1 record. */
export function recordHash(record: unknown): Hex {
  assertDecisionRecord(record);
  return keccak256(utf8(canonicalize(record)));
}

/** leaf = keccak256(0x00 || salt || recordHash) */
export function leafHash(salt: Hex, recordHashHex: Hex): Hex {
  return keccak256(
    concatBytes(Uint8Array.of(LEAF_PREFIX), hexToBytes(salt, 32), hexToBytes(recordHashHex, 32)),
  );
}

/** The sealed leaf for a record and its salt. */
export const recordLeaf = (record: unknown, salt: Hex): Hex => leafHash(salt, recordHash(record));

/**
 * toolHash = keccak256(0x02 || salt || utf8(JCS(value)))
 * Each tool argument object and each result gets its own random salt, so a
 * revealed record does not let anyone guess short arguments like "NVDA".
 * Revealing the plaintext of one call means publishing its value and salt.
 */
export function toolHash(salt: Hex, value: JsonValue): Hex {
  return keccak256(concatBytes(Uint8Array.of(TOOL_PREFIX), hexToBytes(salt, 32), utf8(canonicalize(value))));
}

/**
 * agentId = keccak256(abi.encode(address wallet, uint256 chainId, bytes32 salt)).
 * AgentRegistry computes the same value on chain from msg.sender.
 */
export function agentIdFor(wallet: Address, chainId: bigint | number, salt: Hex): Hex {
  return keccak256(concatBytes(addressWord(wallet), uintWord(chainId), hexToBytes(salt, 32)));
}
