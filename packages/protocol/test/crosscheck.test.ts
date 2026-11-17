/**
 * Every hash checked against viem, an independent keccak / ABI / EIP-712 implementation,
 * so our vectors are not only consistent with themselves.
 */
import fc from 'fast-check';
import { concat, encodeAbiParameters, hashTypedData, keccak256 as viemKeccak, toHex } from 'viem';
import { describe, expect, it } from 'vitest';
import {
  agentIdFor,
  bytesToHex,
  canonicalize,
  hashPair,
  keccak256,
  leafHash,
  newSalt,
  sealRequestDigest,
  SEAL_DOMAIN_NAME,
  SEAL_DOMAIN_VERSION,
  SEAL_REQUEST_TYPES,
  toolHash,
} from '../src/index.js';
import type { Address, Hex } from '../src/index.js';

const bytes32 = fc.uint8Array({ minLength: 32, maxLength: 32 }).map((b) => bytesToHex(b));
const address = fc.uint8Array({ minLength: 20, maxLength: 20 }).map((b) => bytesToHex(b) as Address);

describe('cross-checked against viem', () => {
  it('keccak256 of arbitrary bytes', () => {
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 300 }), (b) => {
        expect(keccak256(b)).toBe(viemKeccak(b));
      }),
    );
  });

  it('leaf = keccak256(0x00 || salt || recordHash)', () => {
    fc.assert(
      fc.property(bytes32, bytes32, (salt, rh) => {
        expect(leafHash(salt, rh)).toBe(viemKeccak(concat(['0x00', salt, rh])));
      }),
    );
  });

  it('interior node = keccak256(0x01 || min || max)', () => {
    fc.assert(
      fc.property(bytes32, bytes32, (a, b) => {
        const [lo, hi] = BigInt(a) <= BigInt(b) ? [a, b] : [b, a];
        expect(hashPair(a, b)).toBe(viemKeccak(concat(['0x01', lo, hi])));
      }),
    );
  });

  it('toolHash = keccak256(0x02 || salt || utf8(JCS(value)))', () => {
    fc.assert(
      fc.property(bytes32, fc.jsonValue({ maxDepth: 2 }), (salt, value) => {
        let canon: string;
        try {
          canon = canonicalize(value);
        } catch {
          return; // not I-JSON
        }
        expect(toolHash(salt, value as never)).toBe(viemKeccak(concat(['0x02', salt, toHex(canon)])));
      }),
    );
  });

  it('agentId = keccak256(abi.encode(address, uint256, bytes32))', () => {
    fc.assert(
      fc.property(
        address,
        fc.bigInt({ min: 1n, max: (1n << 64n) - 1n }),
        bytes32,
        (wallet, chainId, salt) => {
          expect(agentIdFor(wallet, chainId, salt)).toBe(
            viemKeccak(
              encodeAbiParameters(
                [{ type: 'address' }, { type: 'uint256' }, { type: 'bytes32' }],
                [wallet, chainId, salt],
              ),
            ),
          );
        },
      ),
    );
  });

  it('EIP-712 SealRequest digest', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        address,
        bytes32,
        bytes32,
        fc.bigInt({ min: 0n, max: (1n << 64n) - 1n }),
        fc.integer({ min: 1, max: 2 ** 32 - 1 }),
        fc.bigInt({ min: 0n, max: (1n << 256n) - 1n }),
        (chainId, verifyingContract, agentId, root, firstSeq, count, deadline) => {
          const message = { agentId, root, firstSeq, count, deadline };
          const viemDigest = hashTypedData({
            domain: { name: SEAL_DOMAIN_NAME, version: SEAL_DOMAIN_VERSION, chainId, verifyingContract },
            types: SEAL_REQUEST_TYPES,
            primaryType: 'SealRequest',
            message,
          });
          expect(sealRequestDigest(chainId, verifyingContract, message)).toBe(viemDigest);
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('newSalt', () => {
  it('returns 32 fresh random bytes as lowercase hex', () => {
    const salts = new Set(Array.from({ length: 200 }, () => newSalt()));
    expect(salts.size).toBe(200);
    for (const s of salts) expect(s).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

describe('input validation', () => {
  it('refuses uppercase or wrong-length hex', () => {
    const ok = `0x${'ab'.repeat(32)}` as Hex;
    expect(() => leafHash(`0x${'AB'.repeat(32)}` as Hex, ok)).toThrow();
    expect(() => leafHash(`0x${'ab'.repeat(31)}` as Hex, ok)).toThrow();
    expect(() => agentIdFor('0xABCDEF0000000000000000000000000000000000', 1, ok)).toThrow();
  });
  it('refuses EIP-712 values that overflow their Solidity types', () => {
    const z = `0x${'00'.repeat(32)}` as Hex;
    const c = '0x0000000000000000000000000000000000000001' as Address;
    expect(() =>
      sealRequestDigest(1, c, { agentId: z, root: z, firstSeq: 1n << 64n, count: 1, deadline: 0 }),
    ).toThrow(RangeError);
    expect(() =>
      sealRequestDigest(1, c, { agentId: z, root: z, firstSeq: 0, count: 2 ** 32, deadline: 0 }),
    ).toThrow(RangeError);
  });
});
