'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {verifyRelease,verifyTechnical,verifyArchive}=require('../scripts/verify-staging-release.cjs');
function fixture(t){
 const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'release-integrity-'));
 t.after(()=>fs.rmSync(cwd,{recursive:true,force:true}));
 const git=(...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
 git('init','-q');git('config','user.name','Synthetic test');git('config','user.email','test@example.invalid');
 const write=(name,value)=>{const file=path.join(cwd,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);};
 for(const prefix of ['','preview/'])for(const name of ['index.html','sw.js','manifest.webmanifest','assistant/module.js'])write(prefix+name,prefix+name);
 const commit=()=>{git('add','-A');git('commit','-qm','fixture');return git('rev-parse','HEAD');};
 const base=commit();
 const policy={surfaces:{production:{version:'1'},preview:{version:'1'}},integrity:{productionRef:base,previewRef:base,stagingBaseRef:base,stagingAllowedPaths:[]}};
 return {cwd,git,write,commit,base,policy};
}
test('technical docs accepted; entire root and preview pinned',t=>{
 const f=fixture(t);f.write('docs/design.md','test');const head=f.commit();
 assert.deepEqual(verifyRelease(f.cwd,head,f.policy),{production:4,preview:4});
 assert.deepEqual(verifyTechnical(f.cwd,f.base,head,new Set(['docs/design.md'])).changed,['docs/design.md']);
 assert.throws(()=>verifyTechnical(f.cwd,f.base,head,new Set()),/Unapproved technical change/);
});
for(const surface of ['', 'preview/'])test('unapproved nested runtime file modification fails: '+surface,t=>{
 const f=fixture(t);f.write(surface+'assistant/module.js','tamper');const head=f.commit();
 assert.throws(()=>verifyRelease(f.cwd,head,f.policy),/runtime tree differs/);
});
test('runtime deletion and unexpected new runtime path fail',t=>{
 const f=fixture(t);fs.unlinkSync(path.join(f.cwd,'preview/sw.js'));f.write('assets/unapproved.js','tamper');
 assert.throws(()=>verifyRelease(f.cwd,f.commit(),f.policy),/runtime tree differs/);
});
test('staging allows only reviewed preview changes and independently pinned candidate',t=>{
 const f=fixture(t);f.write('preview/assistant/module.js','candidate');const candidate=f.commit();
 const policy={...f.policy,surfaces:{production:{version:'1'},preview:{version:'2'}},integrity:{...f.policy.integrity,previewRef:candidate,stagingAllowedPaths:['preview/assistant/module.js']}};
 assert.equal(verifyRelease(f.cwd,candidate,policy).preview,4);
 f.write('docs/unapproved.md','tamper');
 assert.throws(()=>verifyRelease(f.cwd,f.commit(),policy),/Unapproved staging change/);
});
test('bad SHA and self-derived revision aliases are rejected',t=>{
 const f=fixture(t);assert.throws(()=>verifyRelease(f.cwd,f.base,{...f.policy,integrity:{...f.policy.integrity,productionRef:'HEAD'}}),/full commit SHA/);
});
test('archive verification catches changed, missing and additional bytes',t=>{
 const f=fixture(t),artifact=fs.mkdtempSync(path.join(os.tmpdir(),'release-archive-'));
 t.after(()=>fs.rmSync(artifact,{recursive:true,force:true}));
 const tar=execFileSync('git',['archive',f.base],{cwd:f.cwd});
 execFileSync('tar',['-xf','-','-C',artifact],{input:tar});
 assert.equal(verifyArchive(f.cwd,f.base,artifact),8);
 const file=path.join(artifact,'preview','assistant','module.js'),original=fs.readFileSync(file);
 fs.writeFileSync(file,'modified');assert.throws(()=>verifyArchive(f.cwd,f.base,artifact),/Archive files/);
 fs.writeFileSync(file,original);fs.unlinkSync(file);assert.throws(()=>verifyArchive(f.cwd,f.base,artifact),/Archive files/);
 fs.writeFileSync(file,original);fs.writeFileSync(path.join(artifact,'extra.txt'),'extra');assert.throws(()=>verifyArchive(f.cwd,f.base,artifact),/Archive files/);
});
