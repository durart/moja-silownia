import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { productionManifest } from './staging-integrity.mjs';
import { pathToFileURL } from 'node:url';

const directories = new Set(['assets','assistant','backup','modules','preview','progress-v2','styles','vendor']);
export function publicPath(path) {
  const parts = path.split('/');
  if (parts.some(p => !p || p.startsWith('.') || p.includes('\\'))) return false;
  return parts.length > 1 ? directories.has(parts[0]) : /\.(html|js|mjs|css|png|svg|webmanifest|txt)$/.test(path) || path === 'INSTRUKCJA_UZYTKOWNIKA.md';
}
export function precachePath(asset) {
  const relative = asset.replace(/^\.\//,'').split('?')[0] || 'index.html';
  return relative === '' && asset.startsWith('./') ? 'index.html' : relative;
}
export function validateReleaseSha(requested, actual) {
  if (!/^[a-f0-9]{40}$/.test(requested ?? '') || requested !== actual) throw new Error('Release SHA mismatch');
}
export async function buildArtifact(sha, target) {
  validateReleaseSha(sha, execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim());
  await mkdir(target);
  const rows = execFileSync('git',['ls-tree','-r','-z',sha],{encoding:'utf8'}).split('\0').filter(Boolean);
  for (const row of rows) {
    const tab = row.indexOf('\t');
    const [mode,type,oid] = row.slice(0,tab).split(' ');
    const path = row.slice(tab+1);
    if (!publicPath(path)) continue;
    if (type !== 'blob' || !['100644','100755'].includes(mode)) throw new Error('Unsupported tracked file: '+path);
    const dest = join(target,path);
    await mkdir(dirname(dest),{recursive:true});
    await writeFile(dest,execFileSync('git',['cat-file','blob',oid],{maxBuffer:32*1024*1024}),{flag:'wx'});
  }
  for (const prefix of ['', 'preview/']) {
    for (const file of ['index.html','sw.js','manifest.webmanifest']) await readFile(join(target,prefix+file));
  }
  for (const prefix of ['', 'preview/']) {
    const sw = await readFile(join(target,prefix+'sw.js'),'utf8');
    const assets = sw.match(/const ASSETS\s*=\s*\[([\s\S]*?)\];/);
    if (!assets) throw new Error('Missing precache list');
    const paths = [...assets[1].matchAll(/['"]([^'"]+)['"]/g)].map(m=>m[1]);
    if (!paths.length) throw new Error('Empty precache list');
    for (const asset of paths) {
      const relative = precachePath(asset);
      if (!publicPath(prefix+relative)) throw new Error('Invalid precache path: '+asset);
      await readFile(join(target,prefix+relative));
    }
  }
  return createHash('sha256').update(JSON.stringify(await productionManifest(target))).digest('hex');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(await buildArtifact(process.argv[2],process.argv[3]));
}
