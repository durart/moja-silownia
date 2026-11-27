'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const core=require('../preview/modules/circuit-core.js');
const sandbox={};vm.runInNewContext(fs.readFileSync('preview/modules/programs-data.js','utf8'),sandbox);
const p=JSON.parse(JSON.stringify(sandbox.MojaProgramsData[0]));
const catalogSandbox={window:{}};vm.runInNewContext(fs.readFileSync('preview/calisthenics-library.js','utf8'),catalogSandbox);
const ids=new Set(catalogSandbox.window.CALISTHENICS_LIBRARY.map(x=>x.id));
for(const id of ['seed-14','seed-90','seed-93'])ids.add(id);
const e=(type,target,extra={})=>({name:'Test',type,target,...extra});
const single=(moves,rounds=1,rest=60)=>core.build([{moves,rounds,rest}],1);
const act=(r,type,now,actual)=>core.act(r,{type,actual},now);
test('schedule contains 56 sequential days with 32 training, 16 recovery and 8 rest',()=>{
 assert.deepEqual(p.days.map(d=>d.day),Array.from({length:56},(_,i)=>i+1));
 assert.equal(p.days.filter(d=>d.kind==='training').length,32);
 assert.equal(p.days.filter(d=>d.kind==='recovery').length,16);
 assert.equal(p.days.filter(d=>d.kind==='rest').length,8);
 for(const d of p.days){
  assert.equal(d.blocks.length,d.kind==='rest'?0:3);
  for(const [i,b] of d.blocks.entries()){
   assert.ok(b.moves.every(m=>m.id===null||ids.has(m.id)));
   if(d.kind==='training')assert.equal(b.moves.length,5);
   assert.ok(core.build(d.blocks,i+1,p.blockRest).length>0);
  }
 }
});
test('source checkpoints and unresolved labels are preserved',()=>{
 assert.deepEqual(p.days[0].blocks[0].moves.map(m=>m.target),[12,10,12,8,25]);
 assert.equal(p.days[21].blocks[0].rounds,4);
 assert.equal(p.days[52].blocks[0].rounds,3);
 assert.equal(p.days[54].blocks[0].rounds,5);
 assert.equal(p.days[40].blocks[1].rest,40);
 assert.equal(p.days[2].blocks[1].moves[0].target,900);
 assert.equal(p.days.flatMap(d=>d.blocks.flatMap(b=>b.moves.filter(m=>m.unresolved))).length,5);
});
test('round and block rest placement; bilateral timed steps are separate',()=>{
 const steps=core.build([{rounds:2,rest:60,moves:[e('reps',10),e('duration',25)]},{rounds:1,rest:45,moves:[e('duration',20,{perSide:true})]}],2);
 assert.deepEqual(steps.map(s=>s.kind),['exercise','exercise','rest','exercise','exercise','rest','exercise','exercise']);
 assert.equal(steps[2].target,60);assert.equal(steps[5].target,75);
 assert.deepEqual(steps.slice(-2).map(s=>s.side),['lewa','prawa']);
});
test('optional exercise-level rest is supported in generic programs',()=>{
 const s=single([e('reps',10,{restAfter:15}),e('reps',5)]);
 assert.equal(s[1].reason,'exercise');assert.equal(s[1].target,15);
});
test('countdown completes exactly once, starts rest, and does not auto-start next movement',()=>{
 let r=core.create(single([e('duration',25)],2),1000);
 r=act(r,'start',2000);assert.equal(core.remaining(r,3000),24);
 r=act(r,'tick',27000);assert.equal(r.status,'rest');assert.equal(r.records[0].actual,25);
 assert.equal(r.deadline,87000);assert.equal(act(r,'tick',27000),r);
 r=act(r,'tick',90000);assert.equal(r.status,'ready');assert.equal(r.records.length,1);
});
test('sleep/reload beyond exercise and rest deadlines does not invent another completed exercise',()=>{
 let r=act(core.create(single([e('duration',5)],2),0),'start',0);
 r=JSON.parse(JSON.stringify(r));assert.equal(core.valid(r),true);
 r=act(r,'tick',90000);assert.equal(r.status,'ready');assert.equal(r.records.length,1);
});
test('pause excludes time spent paused; early finish saves real seconds',()=>{
 let r=act(core.create(single([e('duration',25)]),0),'start',0);
 r=act(r,'pause',5000);assert.equal(core.remaining(r,99999),20);
 r=act(r,'resume',100000);assert.equal(r.deadline,120000);
 r=act(r,'finish',103900);assert.equal(r.status,'done');assert.equal(r.records[0].actual,8);
});
test('manual reps use actual count; invalid and stale actions cannot double-commit',()=>{
 let r=core.create(single([e('reps',12),e('duration',3)]),0);
 assert.equal(act(r,'reps',0,0),r);r=act(r,'reps',1,9);assert.equal(r.records[0].actual,9);
 r=act(r,'start',2);r=act(r,'tick',3002);assert.equal(r.status,'done');
 assert.equal(act(r,'finish',4000),r);assert.equal(r.records.length,2);
});
test('corrupt saved run rejected; ready timer does not run on its own',()=>{
 const r=core.create(single([e('duration',10)]),0);
 assert.equal(core.valid({...r,position:999}),false);
 assert.equal(act(r,'tick',99999),r);
});
test('preview assets and cache use same version and production remains distinct',()=>{
 const html=fs.readFileSync('preview/index.html','utf8'),sw=fs.readFileSync('preview/sw.js','utf8'),prod=fs.readFileSync('index.html','utf8');
 for(const name of ['modules/circuit-core.js?v=1','modules/programs-data.js?v=1','modules/programs-ui.mjs?v=1','styles/programs.css?v=1']){
  assert.ok(html.includes(name));assert.ok(sw.includes(name));assert.ok(!prod.includes(name));
 }
 assert.match(sw,/moja-silownia-preview-shell/);assert.match(html,/moja-silownia-preview-v01/);
});
