import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectEvidence, manifestDigest, gitManifest, assertSameManifest } from '../scripts/release-evidence.mjs';
import { siteManifest } from '../scripts/staging-integrity.mjs';
import { simulateAuthorization } from '../scripts/release-simulation.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(),'release-evidence-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const artifact = join(root,'site');
  await mkdir(join(artifact,'preview'),{recursive:true});
  await writeFile(join(artifact,'index.html'),'production');
  await writeFile(join(artifact,'preview','index.html'),'staging');
  return {root,artifact};
}

async function repositoryFixture(t) {
  const {root,artifact} = await fixture(t);
  const cwd = join(root,'repo');
  await mkdir(join(cwd,'preview'),{recursive:true});
  const git = args => execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
  git(['init','-q']);
  git(['config','user.name','Test']);
  git(['config','user.email','test@example.invalid']);
  await writeFile(join(cwd,'index.html'),'production');
  await writeFile(join(cwd,'preview','index.html'),'old staging');
  git(['add','.']); git(['commit','-qm','Baseline']);
  const baseSha = git(['rev-parse','HEAD']);
  await writeFile(join(cwd,'preview','index.html'),'staging');
  git(['add','.']); git(['commit','-qm','Preview']);
  return {artifact,cwd,baseSha,sha:git(['rev-parse','HEAD']),output:join(root,'evidence')};
}

test('complete evidence matches independent Git blobs and preserves both manifests',async t=>{
  const f=await repositoryFixture(t);
  const record=await collectEvidence(f);
  assert.deepEqual(record.counts,{total:2,production:1,preview:1});
  assert.equal(record.productionDigest,record.baseProductionDigest);
  assert.equal(record.baselineTrust,'git-pr-base-not-deployed');
  assert.equal(record.deploymentAuthorized,false);
  assert.deepEqual(JSON.parse(await readFile(join(f.output,'full.json'),'utf8')),gitManifest(f.sha,f.cwd));
  assert.equal(JSON.parse(await readFile(join(f.output,'preview.json'),'utf8')).length,1);
});
for (const [name,mutate] of [
  ['modified preview',f=>writeFile(join(f.artifact,'preview','index.html'),'tampered')],
  ['modified production',f=>writeFile(join(f.artifact,'index.html'),'tampered')],
  ['extra file',f=>writeFile(join(f.artifact,'extra.js'),'extra')],
  ['missing preview',f=>rm(join(f.artifact,'preview','index.html'))]
]) test('evidence rejects '+name,async t=>{
  const f=await repositoryFixture(t); await mutate(f);
  await assert.rejects(collectEvidence(f),/manifest differs/);
});
test('manifest hash independent of enumeration order',()=>{
  const a=[['z','a'],['a','b']];assert.equal(manifestDigest(a),manifestDigest([...a].reverse()));
  assert.throws(()=>assertSameManifest(a,[['z','a']]));
});

async function authorizationFixture(t,mode='publish') {
  const {artifact}=await fixture(t);
  const runSha='a'.repeat(40),requestedSha=mode==='rollback'?'b'.repeat(40):runSha;
  const expectedDigest=manifestDigest(await siteManifest(artifact));
  return {mode,branch:'main',requestedSha,currentMainSha:runSha,runSha,runId:'12',artifact,expectedDigest,
    regression:{unit:'success',browser:'success',security:'success'},owner:'owner',
    approval:{reviewer:'owner',status:'approved',runId:'12',sha:requestedSha,digest:expectedDigest,mode},
    trustedPrior:{commit:requestedSha,digest:expectedDigest,deployment:'5'}};
}
test('approved exact artifact is only a simulation',async t=>{
  const result=await simulateAuthorization(await authorizationFixture(t));
  assert.equal(result.simulated,true);assert.equal(result.deploymentAuthorized,false);
});
for (const [name,modify] of [
  ['failed regression',f=>{f.regression.unit='failure'}],
  ['cancelled regression',f=>{f.regression.browser='cancelled'}],
  ['missing security',f=>{delete f.regression.security}],
  ['skipped browser',f=>{f.regression.browser='skipped'}],
  ['wrong branch',f=>{f.branch='preview'}],
  ['wrong requested SHA',f=>{f.requestedSha='c'.repeat(40)}],
  ['stale main',f=>{f.currentMainSha='c'.repeat(40)}],
  ['missing approval',f=>{delete f.approval}],
  ['rejected approval',f=>{f.approval.status='rejected'}],
  ['wrong reviewer',f=>{f.approval.reviewer='assistant'}],
  ['wrong run',f=>{f.approval.runId='13'}],
  ['wrong approved digest',f=>{f.approval.digest='0'.repeat(64)}],
  ['wrong approved SHA',f=>{f.approval.sha='c'.repeat(40)}],
  ['wrong approved mode',f=>{f.approval.mode='rollback'}],
  ['tampered artifact',f=>writeFile(join(f.artifact,'preview','index.html'),'tampered')]
]) test('simulation denies '+name,async t=>{
  const f=await authorizationFixture(t);await modify(f);await assert.rejects(simulateAuthorization(f));
});
test('rollback verifies previous artifact with explicit approval',async t=>{
  const f=await authorizationFixture(t,'rollback');
  assert.equal((await simulateAuthorization(f)).deploymentAuthorized,false);
});
for (const [name,modify] of [
  ['missing trusted record',f=>{delete f.trustedPrior}],
  ['wrong prior deployment',f=>{f.trustedPrior.deployment=''}],
  ['wrong prior digest',f=>{f.trustedPrior.digest='0'.repeat(64)}],
  ['no rollback approval',f=>{delete f.approval}],
  ['stale main during rollback',f=>{f.currentMainSha='c'.repeat(40)}],
  ['corrupted backup',f=>writeFile(join(f.artifact,'index.html'),'corrupted')]
]) test('rollback rejects '+name,async t=>{
  const f=await authorizationFixture(t,'rollback');await modify(f);await assert.rejects(simulateAuthorization(f));
});
