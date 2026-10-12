import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';
import { Ajv2020, type ValidateFunction, type AnySchema } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {
  DocumentError,
  parse_document,
  read_bytes,
  relative_path,
  scoped_path,
  type Diagnostic,
} from './loader.js';

import { digest } from './canonical.js';

const compiled = new Map<string, { files: Map<string, string>; validator: LocalValidator }>();
const DIALECT = 'https://json-schema.org/draft/2020-12/schema';
export function valid_utc_timestamp(value: unknown): boolean {
  if (typeof value !== 'string') return true;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/.exec(value);
  if (!match) return false;
  const [, y, m, d, h, min, sec] = match.map(Number);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return (
    y >= 1 && m >= 1 && m <= 12 && d >= 1 && d <= days[m - 1] && h < 24 && min < 60 && sec < 60
  );
}
function* walk(value: unknown): Generator<Record<string, unknown>> {
  if (value === null || typeof value !== 'object') return;
  if (!Array.isArray(value)) yield value as Record<string, unknown>;
  for (const child of Object.values(value)) yield* walk(child);
}
export interface LocalValidator {
  iter_errors(value: unknown): Diagnostic[];
  validate(value: unknown): boolean;
}
export function local_validator(
  schema_path: string,
  definition?: string | null,
  options: { scope_root?: string } = {},
): LocalValidator {
  const root = realpathSync(options.scope_root ?? dirname(schema_path));
  const safe = scoped_path(schema_path, root);
  const cacheKey = JSON.stringify([root, safe, definition ?? null]);
  const cached = compiled.get(cacheKey);
  if (cached) {
    let unchanged = true;
    for (const [file, identity] of cached.files) {
      if (digest(read_bytes(file, root)) !== identity) {
        unchanged = false;
        break;
      }
    }
    if (unchanged) return cached.validator;
    compiled.delete(cacheKey);
  }
  const files = new Map<string, string>();
  const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: true });
  // The package's CJS default is callable at runtime; NodeNext exposes its module type.
  (addFormats as unknown as (instance: Ajv2020) => void)(ajv);
  ajv.addFormat('date-time', { type: 'string', validate: valid_utc_timestamp });
  const documents = new Map<string, Record<string, unknown>>();
  const references: { uri: string; fragment: string }[] = [];
  const pending = [safe];
  try {
    while (pending.length) {
      const file = pending.pop()!;
      const uri = pathToFileURL(file).href;
      if (documents.has(uri)) continue;
      const raw = read_bytes(file, root);
      files.set(file, digest(raw));
      const schema = parse_document(raw, file);
      if (!schema || typeof schema !== 'object' || Array.isArray(schema))
        throw new DocumentError('SCHEMA_DEFINITION', file, 'Schema root must be an object');
      if (!ajv.validateSchema(schema as AnySchema))
        throw new DocumentError('SCHEMA_DEFINITION', file, ajv.errorsText());
      documents.set(uri, schema as Record<string, unknown>);
      for (const node of walk(schema)) {
        if ('$id' in node)
          throw new DocumentError('SCHEMA_RESOURCE_ID', file, 'Schema $id is not permitted');
        if ('$schema' in node && node.$schema !== DIALECT)
          throw new DocumentError('SCHEMA_DIALECT', file, 'Only draft 2020-12 is supported');
        for (const key of ['$ref', '$dynamicRef']) {
          if (!(key in node)) continue;
          const ref = node[key];
          if (typeof ref !== 'string')
            throw new DocumentError('SCHEMA_REFERENCE', file, 'Reference must be a string');
          const [pathname, ...fragments] = ref.split('#');
          if (/[?:%]/.test(pathname) || pathname.startsWith('//') || fragments.length > 1)
            throw new DocumentError(
              'SCHEMA_REFERENCE',
              file,
              'Only local relative schema references are permitted',
            );
          const target = pathname
            ? scoped_path(relative_path(pathname, dirname(file)), root)
            : file;
          pending.push(target);
          references.push({ uri: pathToFileURL(target).href, fragment: fragments[0] ?? '' });
        }
      }
    }
    for (const { uri, fragment } of references) {
      let node: unknown = documents.get(uri);
      if (fragment && !fragment.startsWith('/'))
        throw new DocumentError(
          'SCHEMA_REFERENCE',
          uri,
          'Only JSON Pointer fragments are supported',
        );
      if (fragment)
        for (const raw of decodeURIComponent(fragment).slice(1).split('/')) {
          const part = raw.replace(/~1/g, '/').replace(/~0/g, '~');
          if (!node || typeof node !== 'object' || !Object.hasOwn(node, part))
            throw new DocumentError(
              'SCHEMA_REFERENCE',
              uri,
              `Unresolved local schema fragment: ${fragment}`,
            );
          node = (node as Record<string, unknown>)[part];
        }
    }
    for (const [uri, schema] of documents) ajv.addSchema(schema as AnySchema, uri);
    const ref = pathToFileURL(safe).href + (definition ? `#/$defs/${definition}` : '');
    const validate: ValidateFunction = ajv.compile({ $ref: ref });
    const validator: LocalValidator = {
      validate: (value) => Boolean(validate(value)),
      iter_errors(value) {
        validate(value);
        return (validate.errors ?? []).map((error) => ({
          code: 'SCHEMA_INVALID',
          path: error.instancePath || '/',
          message: error.message ?? 'Invalid value',
        }));
      },
    };
    if (compiled.size >= 64) compiled.delete(compiled.keys().next().value!);
    compiled.set(cacheKey, { files, validator });
    return validator;
  } catch (error) {
    if (error instanceof DocumentError) throw error;
    throw new DocumentError(
      'SCHEMA_DEFINITION',
      schema_path,
      error instanceof Error ? error.message : String(error),
    );
  }
}
export function validate_document(
  value: unknown,
  schema_path: string,
  definition?: string | null,
): Diagnostic[] {
  try {
    return local_validator(schema_path, definition).iter_errors(value);
  } catch (error) {
    if (error instanceof DocumentError) return [error.diagnostic()];
    return [{ code: 'SCHEMA_DEFINITION', path: schema_path, message: String(error) }];
  }
}
