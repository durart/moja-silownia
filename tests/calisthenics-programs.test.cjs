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
 for(const name of ['modules/circuit-core.js?v=1','modules/programs-data.js?v=1','modules/programs-ui.mjs?v=2','styles/programs.css?v=2','modules/program-history.js?v=1']){
  assert.ok(html.includes(name));assert.ok(sw.includes(name));assert.ok(!prod.includes(name));
 }
 assert.match(sw,/moja-silownia-preview-shell/);assert.match(html,/moja-silownia-preview-v01/);
});

const history=require('../preview/modules/program-history.js');
function sampleProgram(){
 const p={id:'test',version:1,title:'Kalistenika',blockRest:75,days:[{day:1,kind:'training',title:'Podstawy',blocks:[{rounds:1,rest:60,moves:[e('reps',12,{id:'cali-23',perSide:true}),e('duration',25,{id:'seed-93',perSide:true})]}]},{day:2,kind:'rest',blocks:[]}]};
 const d={day:1,blockCount:1,finishedAt:1700000090000,startedAt:1700000000000,records:[{position:0,actual:9,completedAt:1700000010000},{position:1,actual:25,completedAt:1700000040000},{position:2,actual:20,completedAt:1700000090000}]};
 return {p,d,v:{version:1,progress:{test:{version:1,nextDay:3,completed:[d,{day:2,blockCount:0,finishedAt:1700000100000,records:[]}]}},active:null}};
}
test('session adapter preserves actual results, seconds, side, rounds, and actual elapsed duration',()=>{
 const {p,d}=sampleProgram(),s=history.createSession(p,p.days[0],d,core,3);
 assert.equal(s.durationSeconds,90);assert.equal(s.sets.length,3);assert.equal(s.sets[0].reps,9);
 assert.equal(s.sets[0].programSet.perSide,true);assert.equal(s.sets[1].programSet.side,'lewa');assert.equal(s.sets[2].programSet.side,'prawa');assert.equal(s.sets[2].durationSeconds,20);
 assert.ok(!Object.hasOwn(s.sets[1],'reps'));assert.ok(!Object.hasOwn(s.sets[0],'rir'));
});
test('migration is immutable, skips rest, handles id collisions, never duplicates on reload',()=>{
 const {p,v,d}=sampleProgram(),before=JSON.stringify(v),existing={id:d.finishedAt,date:'2026-01-01',sets:[]};
 const out=history.reconcile(v,[existing],[p],core);
 assert.equal(JSON.stringify(v),before);assert.equal(out.sessions.length,2);assert.equal(out.added.length,1);assert.equal(out.added[0],d.finishedAt+1);
 assert.equal(out.sessions[0],existing);assert.equal(out.programTraining.progress.test.completed[0].historyId,out.added[0]);
 assert.equal(out.programTraining.progress.test.completed[1].historyId,undefined);
 const again=history.reconcile(out.programTraining,out.sessions,[p],core);
 assert.equal(again.added.length,0);assert.equal(again.sessions,out.sessions);
 assert.equal(history.reconcile(out.programTraining,[],[p],core).sessions.length,0);
});
test('existing session linked without duplication; missing historical duration stays unknown',()=>{
 const {p,v,d}=sampleProgram();delete d.startedAt;
 const s=history.createSession(p,p.days[0],d,core,11);
 assert.equal(s.durationSeconds,null);assert.equal(s.bodyWeightKg,undefined);
 const out=history.reconcile(v,[s],[p],core);assert.equal(out.added.length,0);assert.equal(out.sessions.length,1);assert.equal(out.lastId,11);
});
test('summary counts bilateral repetitions and keeps exercise variants distinguishable',()=>{
 const sandbox={};vm.runInNewContext(fs.readFileSync('preview/summary-core.js','utf8'),sandbox);
 const {p,d}=sampleProgram();const s=history.createSession(p,p.days[0],d,core,3);
 s.sets.push({...s.sets[0],name:'Wariant z pauzą'});
 const result=sandbox.SportSummaryCore.build(s,{estimateCalories:()=>{throw Error('Historical weight unknown');}});
 assert.equal(result.reps,36);assert.equal(result.exerciseCount,3);assert.equal(result.timedSeconds,45);assert.equal(result.activeKcal,null);
});
