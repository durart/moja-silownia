import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { authorizeStaging, productionDigest } from '../scripts/release-provenance.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(),'release-proof-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const [baseline,candidate]=['base','candidate'].map(p=>join(root,p));
  for(const dir of [baseline,candidate]){
    await mkdir(join(dir,'preview'),{recursive:true});
    await writeFile(join(dir,'index.html'),'prod');
    await writeFile(join(dir,'preview','index.html'),'test');
  }
  const {publicKey,privateKey}=generateKeyPairSync('ed25519');
  const record={schema:1,repository:'durart/moja-silownia',environment:'production',deployment:'123',commit:'a'.repeat(40),digest:await productionDigest(baseline)};
  return {baseline,candidate,record,signature:sign(null,Buffer.from(JSON.stringify(record)),privateKey),trustedKey:publicKey.export({type:'spki',format:'pem'}),expectedDeployment:'123',expectedCommit:'a'.repeat(40)};
}
test('signed baseline permits preview-only change',async t=>{const f=await fixture(t);await writeFile(join(f.candidate,'preview','index.html'),'new');assert.equal(await authorizeStaging(f),true);});
for(const [name,mutate] of [
 ['tampered signature',f=>{f.signature[0]^=1;}],
 ['wrong signer',f=>{f.trustedKey=generateKeyPairSync('ed25519').publicKey.export({type:'spki',format:'pem'});}],
 ['stale deployment',f=>{f.expectedDeployment='124';}],
 ['wrong commit',f=>{f.expectedCommit='b'.repeat(40);}],
 ['modified record',f=>{f.record.digest='0'.repeat(64);}],
 ['missing trusted deployment',f=>{delete f.expectedDeployment;}],
 ['substituted baseline',f=>writeFile(join(f.baseline,'index.html'),'other')],
 ['modified production candidate',f=>writeFile(join(f.candidate,'index.html'),'other')],
 ['wrong repository',f=>{f.record.repository='other/repo';}]
]) test(name,async t=>{const f=await fixture(t);await mutate(f);await assert.rejects(authorizeStaging(f));});
