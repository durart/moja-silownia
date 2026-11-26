import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyStaging } from '../scripts/staging-integrity.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(),'staging-gate-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const dirs = ['baseline','candidate'].map(p=>join(root,p));
  for (const dir of dirs) {
    await mkdir(join(dir,'preview'),{recursive:true});
    await writeFile(join(dir,'index.html'),'prod');
    await writeFile(join(dir,'sw.js'),'cache');
    await writeFile(join(dir,'preview','index.html'),'test');
  }
  return dirs;
}
test('preview change allowed',async t=>{const [a,b]=await fixture(t);await writeFile(join(b,'preview','index.html'),'new');assert.equal(await verifyStaging(a,b),true);});
for (const [name,mutate] of [
 ['changed production',b=>writeFile(join(b,'index.html'),'changed')],
 ['added production',b=>writeFile(join(b,'extra.js'),'new')],
 ['deleted production',b=>rm(join(b,'sw.js'))],
 ['missing preview',b=>rm(join(b,'preview','index.html'))],
 ['symlink production',b=>symlink('index.html',join(b,'alias'))],
 ['preview prefix spoof',b=>writeFile(join(b,'preview-other'),'new')],
 ['changed cache',b=>writeFile(join(b,'sw.js'),'new')]
]) test(name,async t=>{const [a,b]=await fixture(t);await mutate(b);await assert.rejects(verifyStaging(a,b));});
