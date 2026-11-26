import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function classifyPaths(paths) {
  if (!Array.isArray(paths) || paths.length === 0) throw new Error('Empty change set');
  if (paths.some(p => typeof p !== 'string' || !p || p.startsWith('/') || p.split('/').some(s => !s || s === '.' || s === '..'))) throw new Error('Invalid path');
  if (paths.some(p => /^(\.github\/|scripts\/|tests\/|docs\/)/.test(p))) return 'infrastructure';
  return paths.every(p => p.startsWith('preview/')) ? 'staging' : 'production';
}

export function regressionPassed(kind, regression) {
  return regression === 'success' && ['staging', 'production', 'infrastructure'].includes(kind);
}

// Optional legacy approval prototype; not used by variant B.
export function gatePassed({kind, regression, approval, enabled}) {
  if (regression !== 'success') return false;
  if (kind === 'staging') return approval === 'skipped';
  return ['production','infrastructure'].includes(kind) && enabled === true && approval === 'success';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [base, head] = process.argv.slice(2);
  if (![base,head].every(s => /^[a-f0-9]{40}$/.test(s ?? ''))) throw new Error('Invalid commit SHA');
  const paths = execFileSync('git',['diff','--no-renames','--name-only','-z',base+'...'+head],{encoding:'utf8'}).split('\0').filter(Boolean);
  console.log(classifyPaths(paths));
}
