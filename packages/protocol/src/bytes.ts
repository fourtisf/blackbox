/** Lowercase 0x-prefixed hex string. */
export type Hex = `0x${string}`;
/** Lowercase 0x-prefixed 20-byte address. Records never use checksummed (mixed-case) addresses. */
export type Address = `0x${string}`;

export const ZERO_HASH = `0x${'00'.repeat(32)}` as Hex;

const HEX32 = /^0x[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const HEX_ANY = /^0x(?:[0-9a-f]{2})*$/;

export const isHex32 = (v: unknown): v is Hex => typeof v === 'string' && HEX32.test(v);
export const isAddress = (v: unknown): v is Address => typeof v === 'string' && ADDRESS.test(v);

const encoder = new TextEncoder();
export const utf8 = (s: string): Uint8Array => encoder.encode(s);

export function bytesToHex(bytes: Uint8Array): Hex {
  let out = '0x';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out as Hex;
}

/** Parses strict lowercase 0x hex. Pass `length` to require an exact byte length. */
export function hexToBytes(hex: string, length?: number): Uint8Array {
  if (!HEX_ANY.test(hex))
    throw new TypeError(`Expected lowercase 0x-prefixed hex, got ${JSON.stringify(hex)}`);
  const out = new Uint8Array((hex.length - 2) / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(2 + i * 2, 4 + i * 2), 16);
  if (length !== undefined && out.length !== length) {
    throw new TypeError(`Expected ${length} bytes, got ${out.length}`);
  }
  return out;
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Lexicographic byte order. For equal-length hashes this is the same as comparing them as uint256. */
export function compareBytes(a: Uint8Array, b: Uint8Array): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return a[i]! - b[i]!;
  return a.length - b.length;
}

/** One 32-byte ABI word holding an unsigned integer (abi.encode of uintN). */
export function uintWord(value: bigint | number): Uint8Array {
  let v = BigInt(value);
  if (v < 0n || v >= 1n << 256n) throw new RangeError(`uint256 out of range: ${v}`);
  const out = new Uint8Array(32);
  for (let i = 31; i >= 0 && v > 0n; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

/** One 32-byte ABI word holding an address (left-padded, as abi.encode does). */
export function addressWord(address: Address): Uint8Array {
  const out = new Uint8Array(32);
  out.set(hexToBytes(address, 20), 12);
  return out;
}
