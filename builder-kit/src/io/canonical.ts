import { createHash } from 'node:crypto';

/** Python sorts Unicode keys by code point, rather than UTF-16 code unit. */
export function unicode_compare(a: string, b: string): number {
  const left = Array.from(a, (c) => c.codePointAt(0)!);
  const right = Array.from(b, (c) => c.codePointAt(0)!);
  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return left.length - right.length;
}

export function digest(raw: Uint8Array | string): string {
  return `sha256:${createHash('sha256').update(raw).digest('hex')}`;
}

/** Stable record encoding. Reject values whose identity cannot be represented safely. */
export function canonical_json(value: unknown): Buffer {
  const ancestors = new Set<object>();
  function encode(item: unknown): string {
    if (item === null) return 'null';
    if (typeof item === 'string') {
      if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(item))
        throw new Error('Unpaired Unicode surrogate cannot be encoded as UTF-8');
      return JSON.stringify(item);
    }
    if (typeof item === 'boolean') return JSON.stringify(item);
    if (typeof item === 'number') {
      if (!Number.isSafeInteger(item) || Object.is(item, -0)) {
        throw new Error('Record identity requires safe integers; unsupported numeric value');
      }
      return String(item);
    }
    if (typeof item !== 'object') throw new Error('Only JSON values may be recorded');
    if (ancestors.has(item)) throw new Error('Cyclic record value');
    ancestors.add(item);
    let result: string;
    if (Array.isArray(item)) result = `[${Array.from(item, encode).join(',')}]`;
    else {
      const prototype = Object.getPrototypeOf(item);
      if (prototype !== Object.prototype && prototype !== null)
        throw new Error('Only plain JSON objects may be recorded');
      const record = item as Record<string, unknown>;
      result = `{${Object.keys(record)
        .sort(unicode_compare)
        .map((key) => `${encode(key)}:${encode(record[key])}`)
        .join(',')}}`;
    }
    ancestors.delete(item);
    return result;
  }
  return Buffer.from(encode(value), 'utf8');
}
