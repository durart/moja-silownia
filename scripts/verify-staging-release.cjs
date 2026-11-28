'use strict';
// Check complete tracked runtime trees against independently reviewed, immutable refs.
// Technical files are excluded from runtime comparison, not from the technical diff gate.
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const expectations=require('../tests/release-expectations.json');
const shaPattern=/^[a-f0-9]{40}$/;
const technicalPath=name=>/^(?:tests|docs|scripts|\.github\/workflows)\//.test(name);
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',maxBuffer:32*1024*1024});
function exactCommit(cwd,sha){
 assert.match(sha,shaPattern,'Expected full commit SHA');
 assert.equal(git(cwd,'rev-parse','--verify',sha+'^{commit}').trim(),sha,'Commit does not match pinned SHA');
 return sha;
}
function treeEntries(cwd,sha){
 exactCommit(cwd,sha);
 return git(cwd,'ls-tree','-r','-z',sha).split('\0').filter(Boolean).map(row=>{
  const tab=row.indexOf('\t');
  const [mode,type,oid]=row.slice(0,tab).split(' ');
  const name=row.slice(tab+1);
  assert.equal(type,'blob','Unsupported Git object: '+name);
  assert.ok(['100644','100755'].includes(mode),'Unsupported Git mode: '+name);
  assert.match(oid,shaPattern);
  return [name,mode,oid];
 }).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
}
function surfaceTree(entries,surface){
 assert.ok(['production','preview'].includes(surface),'Unknown surface');
 return entries.filter(([name])=>surface==='preview'?name.startsWith('preview/'):!name.startsWith('preview/')&&!technicalPath(name));
}
function compareSurface(cwd,head,approved,surface){
 const actual=surfaceTree(treeEntries(cwd,head),surface);
 const expected=surfaceTree(treeEntries(cwd,approved),surface);
 const prefix=surface==='preview'?'preview/':'';
 for(const name of ['index.html','sw.js','manifest.webmanifest'])assert.ok(expected.some(([p])=>p===prefix+name),'Missing approved runtime file: '+prefix+name);
 assert.deepEqual(actual,expected,surface+' runtime tree differs from approved ref '+approved);
 return actual.length;
}
function changedPaths(cwd,base,head){
 exactCommit(cwd,base);exactCommit(cwd,head);
 return git(cwd,'diff','--name-only','--no-renames','-z',base,head).split('\0').filter(Boolean);
}
function verifyRelease(cwd,head,policy=expectations){
 const config=policy.integrity;
 const production=compareSurface(cwd,head,config.productionRef,'production');
 const preview=compareSurface(cwd,head,config.previewRef,'preview');
 if(policy.surfaces.production.version!==policy.surfaces.preview.version){
  assert.equal(config.productionRef,config.stagingBaseRef,'Staging must preserve reviewed production baseline');
  const changed=changedPaths(cwd,config.stagingBaseRef,head);
  const allowed=new Set(config.stagingAllowedPaths);
  assert.ok(changed.some(name=>name.startsWith('preview/')),'Staging must contain a candidate change');
  for(const name of changed)assert.ok(allowed.has(name),'Unapproved staging change: '+name);
 }
 return {production,preview};
}
function verifyTechnical(cwd,base,head,allowed){
 const changed=changedPaths(cwd,base,head);
 assert.ok(changed.length,'No technical changes');
 for(const name of changed){
  assert.ok(technicalPath(name)&&allowed.has(name),'Unapproved technical change: '+name);
 }
 return {production:compareSurface(cwd,head,base,'production'),preview:compareSurface(cwd,head,base,'preview'),changed};
}
function verifyArchive(cwd,sha,root){
 const expected=treeEntries(cwd,sha);
 const actual=[];
 function walk(dir,relative=''){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
   const name=relative+entry.name,full=path.join(dir,entry.name);
   const stat=fs.lstatSync(full);
   if(stat.isDirectory()){walk(full,name+'/');continue;}
   assert.ok(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1,'Unsupported artifact entry: '+name);
   const bytes=fs.readFileSync(full);
   const mode=stat.mode&0o111?'100755':'100644';
   const oid=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
   actual.push([name,mode,oid]);
  }
 }
 assert.ok(fs.lstatSync(root).isDirectory()&&!fs.lstatSync(root).isSymbolicLink(),'Invalid artifact root');
 walk(root);
 actual.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
 assert.deepEqual(actual,expected,'Archive files, modes or content differ from exact commit');
 return actual.length;
}
if(require.main===module){
 const cwd=process.cwd(),head=git(cwd,'rev-parse','HEAD').trim();
 const result=verifyRelease(cwd,head);
 console.log('PASS: independently pinned complete runtime trees',JSON.stringify(result));
}
module.exports={exactCommit,treeEntries,surfaceTree,compareSurface,changedPaths,verifyRelease,verifyTechnical,verifyArchive};
