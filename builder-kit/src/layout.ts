/** Read either framework layout; never rewrite captured configuration paths. */
import fs from 'node:fs';
import path from 'node:path';
import { DocumentError, relative_path } from './io/loader.js';

const LEGACY: Record<string, string> = {
  'workflows/setup/setup.md': 'workflows/setup.md',
  'workflows/updates/update-boneharness.md': 'workflows/update-boneharness.md',
  'workflows/shared/context.md': 'workflows/context.md',
  'workflows/shared/recovery.md': 'workflows/recovery.md',
  'workflows/shared/adapter-interface.md': 'adapters/adapter-interface.md',
  'workflows/development/source-evidence.md': 'workflows/source-evidence.md',
  'workflows/development/verification-rules.md': 'workflows/verification-rules.md',
};

export function framework_relative(root: string, name: string): string {
  function containsSchemas(directory: string): boolean {
    try {
      return fs
        .readdirSync(relative_path(directory, root, { directory: true }))
        .some((file) => file.endsWith('.schema.json'));
    } catch (error) {
      if (error instanceof DocumentError && error.code === 'PATH_MISSING') return false;
      throw error;
    }
  }
  const current = containsSchemas('schemas'),
    legacy = containsSchemas('templates/schemas');
  if (current && legacy)
    throw new Error('Mixed framework schema layouts; reconcile before continuing');
  if (legacy) {
    if (name === 'schemas' || name.startsWith('schemas/')) return 'templates/' + name;
    return LEGACY[name] ?? name;
  }
  return name;
}

export function framework_path(root: string, name: string): string {
  return path.join(root, framework_relative(root, name));
}
