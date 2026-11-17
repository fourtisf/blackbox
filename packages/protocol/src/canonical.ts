/**
 * RFC 8785 JSON Canonicalization Scheme (JCS).
 *
 * - Object keys sorted by UTF-16 code units (JavaScript's default string sort).
 * - No whitespace.
 * - Strings and numbers serialized exactly as ECMAScript's JSON.stringify does,
 *   which is what RFC 8785 specifies (§3.2.2.2, §3.2.2.3).
 * - Input must be I-JSON (RFC 7493): no lone surrogates, no NaN or Infinity.
 *
 * We reject anything that is not plain JSON data (undefined, functions, BigInt,
 * Dates, class instances, sparse arrays, cycles) instead of silently dropping or
 * converting it, so two implementations can never disagree about the bytes.
 */

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export class CanonicalizationError extends Error {
  override name = 'CanonicalizationError';
}

export function canonicalize(value: unknown): string {
  return serialize(value, '$', new Set());
}

function serialize(value: unknown, path: string, stack: Set<object>): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      if (!Number.isFinite(value)) throw new CanonicalizationError(`${path}: ${value} is not valid JSON`);
      return JSON.stringify(value); // ES Number serialization; -0 becomes "0"
    case 'string':
      assertWellFormed(value, path);
      return JSON.stringify(value);
    case 'object':
      break;
    default:
      throw new CanonicalizationError(`${path}: ${typeof value} is not a JSON value`);
  }

  const obj = value as object;
  if (stack.has(obj)) throw new CanonicalizationError(`${path}: circular reference`);
  stack.add(obj);
  let out: string;
  if (Array.isArray(obj)) {
    const parts: string[] = [];
    for (let i = 0; i < obj.length; i++) {
      if (!(i in obj)) throw new CanonicalizationError(`${path}[${i}]: sparse arrays are not JSON`);
      parts.push(serialize(obj[i], `${path}[${i}]`, stack));
    }
    out = `[${parts.join(',')}]`;
  } else {
    const proto = Object.getPrototypeOf(obj);
    if (proto !== Object.prototype && proto !== null) {
      throw new CanonicalizationError(`${path}: only plain objects are allowed`);
    }
    const record = obj as Record<string, unknown>;
    const parts: string[] = [];
    for (const key of Object.keys(record).sort()) {
      assertWellFormed(key, `${path} key`);
      const child = record[key];
      if (child === undefined) throw new CanonicalizationError(`${path}.${key}: undefined is not JSON`);
      parts.push(`${JSON.stringify(key)}:${serialize(child, `${path}.${key}`, stack)}`);
    }
    out = `{${parts.join(',')}}`;
  }
  stack.delete(obj);
  return out;
}

function assertWellFormed(s: string, path: string): void {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = s.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        i++;
        continue;
      }
      throw new CanonicalizationError(`${path}: lone surrogate at index ${i}`);
    }
    if (c >= 0xdc00 && c <= 0xdfff) throw new CanonicalizationError(`${path}: lone surrogate at index ${i}`);
  }
}
