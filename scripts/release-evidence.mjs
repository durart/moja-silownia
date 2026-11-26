import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { siteManifest } from './staging-integrity.mjs';
import { publicPath } from './release-artifact.mjs';
import { classifyPaths } from './release-gate.mjs';

const shaPattern = /^[a-f0-9]{40}$/;
const digest = value => createHash('sha256').update(value).digest('hex');
const sortEntries = entries => [...entries].sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0);

export function manifestDigest(entries) {
  return digest(JSON.stringify(sortEntries(entries)));
}

export function assertSameManifest(expected, actual) {
  if (JSON.stringify(sortEntries(expected)) !== JSON.stringify(sortEntries(actual))) {
    throw new Error('Artifact manifest differs');
  }
}

export function gitManifest(sha, cwd = process.cwd()) {
  if (!shaPattern.test(sha ?? '')) throw new Error('Invalid source SHA');
  const git = args => execFileSync('git', args, { cwd, maxBuffer: 32 * 1024 * 1024 });
  if (git(['rev-parse', sha + '^{commit}']).toString().trim() !== sha) throw new Error('Source SHA mismatch');
  const rows = git(['ls-tree','-r','-z',sha]).toString().split('\0').filter(Boolean);
  return sortEntries(rows.flatMap(row => {
    const tab = row.indexOf('\t');
    const [mode,type] = row.slice(0,tab).split(' ');
    const path = row.slice(tab+1);
    if (!publicPath(path)) return [];
    if (type !== 'blob' || !['100644','100755'].includes(mode)) throw new Error('Unsupported tracked file: ' + path);
    return [[path, digest(git(['show',sha+':'+path]))]];
  }));
}

export async function collectEvidence({ sha, baseSha, artifact, output, cwd = process.cwd() }) {
  const expected = gitManifest(sha,cwd);
  const baseline = gitManifest(baseSha,cwd);
  const actual = sortEntries(await siteManifest(artifact));
  assertSameManifest(expected,actual);
  const production = entries => entries.filter(([path]) => !path.startsWith('preview/'));
  const preview = entries => entries.filter(([path]) => path.startsWith('preview/'));
  if (!preview(actual).some(([path])=>path==='preview/index.html')) throw new Error('Missing preview index');
  const changedPaths = execFileSync('git',['diff','--no-renames','--name-only','-z',baseSha,sha],{cwd,encoding:'utf8'}).split('\0').filter(Boolean);
  const kind = classifyPaths(changedPaths);
  if (kind === 'staging') assertSameManifest(production(baseline),production(actual));
  const record = {
    schema: 1, sourceSha: sha, baseSha, kind, baselineTrust: 'git-pr-base-not-deployed',
    fullDigest: manifestDigest(actual), productionDigest: manifestDigest(production(actual)),
    previewDigest: manifestDigest(preview(actual)), baseProductionDigest: manifestDigest(production(baseline)),
    counts: { total: actual.length, production: production(actual).length, preview: preview(actual).length },
    deploymentAuthorized: false
  };
  await mkdir(output);
  for (const [name,value] of Object.entries({record,full:actual,production:production(actual),preview:preview(actual),baseline})) {
    await writeFile(join(output,name+'.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
  }
  return record;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [sha,baseSha,artifact,output] = process.argv.slice(2);
  if (process.argv.length !== 6) throw new Error('Expected source SHA, base SHA, artifact and evidence directories');
  console.log(JSON.stringify(await collectEvidence({sha,baseSha,artifact,output})));
}
