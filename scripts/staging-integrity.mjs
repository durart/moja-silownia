import { readdir, readFile, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export async function productionManifest(root) {
  const entries = [];
  async function walk(relative = '') {
    for (const name of (await readdir(join(root, relative))).sort()) {
      const path = relative ? relative + '/' + name : name;
      const full = join(root, path);
      const stat = await lstat(full);
      if (stat.isSymbolicLink()) throw new Error('Symlink forbidden: ' + path);
      if (path === 'preview') {
        if (!stat.isDirectory()) throw new Error('Invalid preview directory');
        continue;
      }
      if (stat.isDirectory()) await walk(path);
      else if (stat.isFile()) entries.push([path, createHash('sha256').update(await readFile(full)).digest('hex')]);
      else throw new Error('Unsupported file: ' + path);
    }
  }
  await walk();
  if (!entries.some(([path]) => path === 'index.html')) throw new Error('Missing production index');
  return entries;
}

export async function verifyStaging(baseline, candidate) {
  const before = await productionManifest(baseline);
  const after = await productionManifest(candidate);
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Production artifact differs');
  const preview = await lstat(join(candidate, 'preview', 'index.html'));
  if (!preview.isFile() || preview.isSymbolicLink()) throw new Error('Missing preview index');
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 4) throw new Error('Expected baseline and candidate directories');
  await verifyStaging(process.argv[2], process.argv[3]);
  console.log('Production artifact unchanged');
}
