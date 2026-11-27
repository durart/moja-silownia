
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url);
const expected={
  "cali-23": "e8c59483b6c149f728558b9549f2293249c5e89e",
  "cali-24": "f56624547056b7936bb31f6087eabc7f648a1323",
  "cali-25": "6c1ff744b33c8409f180eec6c4d44a240dcb3da3",
  "cali-26": "17ce64cc7987e86681f0c103589a118c77d80a65",
  "cali-27": "f50543b54c7afa8379187f225d4ea02cb4c41ebc",
  "cali-28": "8b0466e389b5068d9eb1bcfe68058d2d17420692",
  "cali-29": "6e9967861b36ba8e67bc16830c31da20441d6956",
  "cali-30": "a221fbd07b4f0ec327960148a0c3f27249be208f",
  "cali-31": "66e0cf35535bdcd21b53379171f2b2ed20f6864b",
  "cali-32": "18e631e0376e9d8051732765a0db76b0f0a9e91d",
  "cali-33": "62ff943b53d5d7636d745ac2df4af55635130623",
  "cali-34": "dec654f379d260d32b1ba2c1bb14b11b7510be73",
  "cali-35": "80953b626114c3b71182c6a33924be9e14d3c687",
  "cali-36": "845866b238679b0ece7e05d95228c77ab0872781",
  "cali-37": "4f19740715e3d1c2ca6772ffac29c9825d3be2ab",
  "cali-38": "2d7410d9d03deb688e7c8a2e238b3894836b6680",
  "cali-39": "4afd2ba186738f898d58081be72febcef799deb4",
  "cali-40": "2fc0b28415198ce8930e9b109b58e5e3a6b8da1f"
};
function load(prefix){
 const sandbox={window:{}};
 vm.runInNewContext(readFileSync(new URL('../'+prefix+'calisthenics-library.js',import.meta.url),'utf8'),sandbox);
 return sandbox.window.CALISTHENICS_LIBRARY;
}
function read(prefix,path){return readFileSync(new URL('../'+prefix+path,import.meta.url));}
for(const prefix of ['', 'preview/']){
 test(prefix+' catalog preserves all 22 old entries and adds exactly 18 stable identities',()=>{
  const ex=load(prefix);
  assert.equal(ex.length,40);
  assert.equal(new Set(ex.map(e=>e.id)).size,40);
  assert.equal(new Set(ex.map(e=>e.name)).size,40);
  assert.deepEqual(Array.from(ex.slice(22),e=>e.id),Object.keys(expected));
  for(const e of ex.slice(22)){
   assert.equal(e.group,'Kalistenika');assert.equal(e.equipment,'Masa ciała');
   assert.ok(e.steps.length>=3&&e.errors&&e.easier&&e.harder&&e.muscles&&e.query);
   assert.ok(e.groups.length>=1);
  }
 });
 test(prefix+' all approved artwork hashes, formats and offline registration match',()=>{
  const sw=read(prefix,'sw.js').toString('utf8');
  for(const [id,sha] of Object.entries(expected)){
   const path='assets/graphics-r6/'+id+'.webp';
   const bytes=read(prefix,path);
   assert.equal(bytes.toString('ascii',0,4),'RIFF');
   assert.equal(bytes.toString('ascii',8,12),'WEBP');
   assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),sha,id);
   assert.ok(sw.includes(JSON.stringify('./'+path)),id);
  }
 });
 test(prefix+' wall sit is timed, other new exercises are repetition based; fatigue profiles are mapped',()=>{
  const timed=require('../'+prefix+'modules/timed-exercise-core.js');
  const fatigue=require('../'+prefix+'muscle-fatigue-core.js');
  for(const e of load(prefix).slice(22)){
   assert.equal(timed.measurementType(e),e.id==='cali-27'?'duration':'reps');
   assert.ok(Object.hasOwn(fatigue.SPECIFIC,e.id),e.id);
   assert.ok(fatigue.profile(e).every(([muscle,weight])=>muscle!=='Inne'&&weight>0&&weight<=1));
  }
  assert.equal(timed.measurementType(load(prefix).find(e=>e.id==='cali-27')),'duration');
  assert.equal(timed.parseDurationTarget('35 s').minSeconds,35);
 });
}
test('candidate keeps existing storage keys and separate cache namespaces',()=>{
 const prod=read('','index.html').toString(),preview=read('preview/','index.html').toString();
 assert.match(prod,/const key='moja-silownia-v01'/);
 assert.match(preview,/const key='moja-silownia-preview-v01'/);
 assert.notEqual(read('','sw.js').toString().match(/const CACHE='([^']+)'/)[1],read('preview/','sw.js').toString().match(/const CACHE='([^']+)'/)[1]);
});
