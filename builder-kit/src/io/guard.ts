/** One exclusive writer across journal helpers and framework publication. */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
interface Owner {
  pid: number;
  token: string;
}
function exists(file: string): boolean {
  try {
    fs.lstatSync(file);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}
function noLink(file: string): void {
  if (exists(file) && fs.lstatSync(file).isSymbolicLink())
    throw new Error('Symlink publication guard refused');
}
function dead(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ESRCH';
  }
}
/** No age based eviction: an existing owner must be demonstrably dead. */
function acquire(lock: string): Owner {
  const owner = { pid: process.pid, token: randomUUID() };
  try {
    const descriptor = fs.openSync(lock, 'wx', 0o600);
    try {
      fs.writeFileSync(descriptor, JSON.stringify(owner));
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }
    return owner;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  }
  noLink(lock);
  const stat = fs.lstatSync(lock);
  if (!stat.isFile() || stat.nlink !== 1) throw new Error('Aliased publication guard refused');
  let prior: Owner;
  try {
    prior = JSON.parse(fs.readFileSync(lock, 'utf8')) as Owner;
  } catch {
    throw new Error(
      'Writer guard is incomplete; preserve it and reconcile ownership before retrying',
    );
  }
  if (
    !Number.isSafeInteger(prior.pid) ||
    prior.pid <= 0 ||
    typeof prior.token !== 'string' ||
    !dead(prior.pid)
  ) {
    throw new Error('Another harness writer is active; retry after it finishes');
  }
  // Serialize stale-owner cleanup. Other contenders fail closed during cleanup.
  const recovery = lock + '.recovery';
  let descriptor: number;
  try {
    descriptor = fs.openSync(recovery, 'wx', 0o600);
  } catch {
    throw new Error('Another harness writer is recovering the guard; retry after it finishes');
  }
  try {
    const current = fs.lstatSync(lock);
    if (
      current.dev !== stat.dev ||
      current.ino !== stat.ino ||
      fs.readFileSync(lock, 'utf8') !== JSON.stringify(prior)
    ) {
      throw new Error('Writer guard changed during recovery; retry');
    }
    fs.unlinkSync(lock);
    return acquire(lock);
  } finally {
    fs.closeSync(descriptor);
    fs.unlinkSync(recovery);
  }
}
export function writing<T>(
  harness: string,
  body: () => T,
  options: {
    recovery?: boolean;
  } = {},
): T {
  const artifacts = path.join(harness, 'artifacts');
  const lock = path.join(artifacts, '.writer.lock');
  noLink(harness);
  noLink(artifacts);
  noLink(lock);
  try {
    fs.mkdirSync(artifacts);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  }
  const owner = acquire(lock);
  try {
    if (!options.recovery) {
      const maintenance = path.join(artifacts, 'maintenance');
      if (exists(maintenance)) {
        noLink(maintenance);
        for (const name of fs.readdirSync(maintenance)) {
          const directory = path.join(maintenance, name);
          const publication = path.join(directory, 'publication.json');
          if (!exists(publication)) continue;
          noLink(directory);
          noLink(publication);
          const record = JSON.parse(fs.readFileSync(publication, 'utf8')) as {
            status?: string;
          };
          if (!['PUBLISHED', 'RESTORED'].includes(record.status ?? '')) {
            throw new Error('Interrupted kit update; run bh update before writing task records');
          }
        }
      }
    }
    return body();
  } finally {
    noLink(lock);
    const current = JSON.parse(fs.readFileSync(lock, 'utf8')) as Owner;
    if (current.token === owner.token && current.pid === owner.pid) fs.unlinkSync(lock);
  }
}
