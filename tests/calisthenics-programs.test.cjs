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
 assert.equal(p.days.flatMap(d=>d.blocks.flatMap(b=>b.moves.filter(m=>m.unresolved||!m.id))).length,0);
 assert.equal(p.legacyDays.flatMap(d=>d.blocks.flatMap(b=>b.moves.filter(m=>m.unresolved))).length,5);
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
 for(const name of ['modules/circuit-core.js?v=2','modules/programs-data.js?v=2','modules/programs-ui.mjs?v=6','styles/programs.css?v=3','modules/calisthenics-progression.js?v=1','modules/program-history.js?v=3','modules/program-preparation.js?v=1']){
  assert.ok(html.includes(name));assert.ok(sw.includes(name));assert.ok(prod.includes(name));
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

test('revision 2 retains structure and targets of every legacy day',()=>{
 assert.equal(p.scheduleRevision,2);
 for(const [i,d] of p.days.entries()){
  const old=p.legacyDays[i];assert.equal(d.kind,old.kind);
  for(const [j,b] of d.blocks.entries()){
   const prev=old.blocks[j];assert.equal(b.rounds,prev.rounds);assert.equal(b.rest,prev.rest);
   assert.deepEqual(b.moves.map(m=>[m.target,m.type,m.perSide]),prev.moves.map(m=>[m.target,m.type,m.perSide]));
   assert.ok(b.moves.every(m=>ids.has(m.id)&&!m.unresolved));
   for(const m of b.moves)if(m.alternative)assert.ok(ids.has(m.alternative.id));
  }
 }
 assert.equal(history.definitionFor(p,3,undefined),p.legacyDays[2]);
 assert.equal(history.definitionFor(p,3,2),p.days[2]);assert.equal(history.definitionFor(p,3,99),undefined);
});
test('all approved assets and catalog identities are registered and cached',()=>{
 const list=catalogSandbox.window.CALISTHENICS_LIBRARY;assert.equal(list.length,64);
 assert.equal(new Set(list.map(e=>e.id)).size,64);
 const crypto=require('node:crypto'),sw=fs.readFileSync('preview/sw.js','utf8');
 const expected='c70f76b9ec05fc6db91339854c6f16f3f2535339 d6042726fd2e7b4fca41f58aef01d0f39e2a6270 afb7c0bedc68c0943713f1cca5a02ea8ff41e41b 4e5f8c40c6818dd8a05d93e4a8352ab23db88f51 4f15a7e8ee9d85294e693aeffb8da6d8fc2fd599 d7f2e929ef95476532f8225d0e2fc669a9dd3bc0 9724ce59d5de31d48907ff06f6f4f4233b2352ce f56726f6d6077f3a7a54c2324daa35fcc5c55c1f e05415e0dadf1125738a5caf6df7ecaae1399ef5 1e78b6278d3684c110d647aaa938b88d21098136 123b1732c052aa1c14faf61ef5f0d2ff026a6bc5 e2afcdc33c47661ef67ed13ca698a74c76daad72'.split(' ');
 const timed=require('../preview/modules/timed-exercise-core.js');
 const fatigue=require('../preview/muscle-fatigue-core.js');
 for(const [i,sha] of expected.entries()){
  const id='cali-'+(41+i),path='assets/graphics-r6/'+id+'.webp',bytes=fs.readFileSync('preview/'+path),ex=list.find(x=>x.id===id);
  assert.equal(crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),sha);
  assert.ok(sw.includes(path));assert.ok(ex.steps.length>=3&&ex.easier&&ex.harder);
  assert.equal(timed.measurementType(ex),[42,49,51,52].includes(41+i)?'duration':'reps');
  assert.ok(Object.hasOwn(fatigue.SPECIFIC,id));
 }
});
test('alternative is recorded only where permitted and mapped to actual exercise in history',()=>{
 const m=p.days[0].blocks[0].moves[1];assert.equal(m.alternative.id,'cali-28');
 let r=core.create(single([m]),1000);
 r=core.act(r,{type:'reps',actual:8,alternative:true},2000);
 assert.equal(r.records[0].alternative,true);assert.equal(core.valid(r),true);
 assert.equal(core.actualStep(r.steps[0],r.records[0]).id,'cali-28');
 const definition={title:'Test',kind:'training',blocks:[{rounds:1,rest:60,moves:[m]}]};
 const s=history.createSession(p,definition,{day:1,blockCount:1,records:r.records,finishedAt:2000,startedAt:1000},core,1);
 assert.equal(s.sets[0].exerciseId,'cali-28');assert.equal(s.sets[0].reps,8);assert.equal(s.sets[0].programSet.alternative,true);
 const clean=core.create(single([e('reps',10)]),0);
 assert.equal(core.act(clean,{type:'reps',actual:8,alternative:true},100),clean);
});
test('legacy active steps remain identical and historical records retain original ids',()=>{
 const old=p.legacyDays[2],fresh=p.days[2];
 const steps=core.build(old.blocks,1,p.blockRest),run=core.create(steps,1000);
 assert.equal(core.valid(JSON.parse(JSON.stringify(run))),true);
 assert.equal(steps.find(m=>m.name==='Koci grzbiet–krowa').id,null);
 assert.equal(core.build(fresh.blocks,1,p.blockRest).find(m=>m.name==='Koci grzbiet–krowa').id,'cali-41');
 const d={day:3,blockCount:1,finishedAt:2000,records:steps.map((s,i)=>({s,i})).filter(x=>x.s.kind==='exercise').map(x=>({position:x.i,actual:x.s.target,completedAt:2000}))};
 const session=history.createSession(p,history.definitionFor(p,3),d,core,3);
 assert.ok(session.sets.some(s=>s.exerciseId.startsWith('program-only-')));
 assert.equal(session.sets.some(s=>s.exerciseId==='cali-41'),false);
});
test('pause metadata is preserved without replacing base identity',()=>{
 const m=p.days[35].blocks[0].moves[0];
 assert.equal(m.id,'cali-12');assert.equal(m.pauseSeconds,2);assert.equal(m.pausePosition,'bottom');
 const d={day:36,blockCount:1,records:[{position:0,actual:10,completedAt:2000}],finishedAt:2000};
 const s=history.createSession(p,p.days[35],d,core,1);
 assert.equal(s.sets[0].programSet.pauseSeconds,2);assert.equal(s.sets[0].exerciseId,'cali-12');
});

const prep=require('../preview/modules/program-preparation.js');
test('warmup and cooldown source targets and timing are preserved',()=>{
 assert.deepEqual(prep.routines.express.map(x=>x.target),[30,30,5,10]);
 assert.deepEqual(prep.routines.standard.map(x=>x.target),[30,20,20,10,20,10,8,3,5]);
 assert.deepEqual(prep.routines.cooldown.map(x=>x.target),[30,20,20,20,20,20,5]);
 assert.equal(prep.routines.cooldown.at(-1).unit,'breaths');
 assert.equal(prep.routines.cooldown.filter(x=>x.perSide).length,4);
});
test('legacy layout remains byte-identical across every day and block selection',()=>{
 for(const def of [p.days,p.legacyDays])for(const d of def)for(let count=1;count<=d.blocks.length;count++){
  assert.deepEqual(prep.layout(core,d.blocks,count,p.blockRest,null).steps,core.build(d.blocks,count,p.blockRest));
 }
});
test('optional phases can be skipped without affecting work sets',()=>{
 const d=p.days[0],cfg={version:1,warmup:'express',cooldown:true},l=prep.layout(core,d.blocks,1,p.blockRest,cfg);
 let run=core.create(l.steps,1000);
 run=core.act(run,{type:'start'},1000);run=core.act(run,{type:'tick'},31000);
 assert.equal(run.records[0].actual,30);
 run=prep.skipPhase(run,32000);assert.equal(run.position,l.mainOffset);
 assert.equal(core.valid(run),true);
 assert.equal(prep.skipPhase(run,32001),run);
 let now=33000;
 while(!run.steps[run.position]?.phase&&run.status!=='done'){
  const s=run.steps[run.position];run=core.act(run,s.kind==='rest'?{type:'skipRest'}:{type:s.type==='duration'?'manual':'reps',actual:s.target},now++);
 }
 assert.equal(run.steps[run.position].phase,'cooldown');
 run=prep.skipPhase(run,now);assert.equal(run.status,'done');assert.ok(core.valid(run));
 const split=prep.split(l,run.records);assert.equal(split.main.length,15);assert.equal(split.aux.length,1);
 assert.ok(prep.validateAuxiliary(l,split.aux,core));assert.deepEqual(prep.review(l,split.main,split.aux),run.records);
 assert.equal(prep.validateAuxiliary(l,[...split.aux,split.aux[0]],core),false);
 const completed={day:1,blockCount:1,records:split.main,finishedAt:now,startedAt:1000,auxiliary:{...cfg,records:split.aux,mainStartedAt:32000,mainFinishedAt:now-1}};
 const s=history.createSession(p,d,completed,core,1);
 assert.equal(s.sets.length,15);assert.equal(s.program.auxiliary.completedSteps,1);
 assert.ok(s.sets.every(x=>x.exerciseId!=='cali-35'));
});
test('new mobility entries have descriptions and draft art registered offline',()=>{
 const list=catalogSandbox.window.CALISTHENICS_LIBRARY,sw=fs.readFileSync('preview/sw.js','utf8');
 const timed=require('../preview/modules/timed-exercise-core.js');
 for(let i=53;i<=64;i++){
  const id='cali-'+i,e=list.find(x=>x.id===id),file='assets/graphics-r6/'+id+'.webp';
  assert.ok(e.steps.length>=3&&e.errors&&e.easier);assert.ok(sw.includes(file));assert.ok(fs.statSync('preview/'+file).size>1000);
  assert.equal(timed.measurementType(e),i>=59&&i<=63?'duration':'reps');
 }
});

const progression=require('../preview/modules/calisthenics-progression.js');
function progressionFixture(move,kind='training'){
 const def={kind,blocks:[{rounds:2,rest:60,moves:[move]}]};
 const program={days:[{...def,day:1},{...def,day:2}],blockRest:75};
 const completed=(day,values,alternative=false)=>({day,finishedAt:day*1000,blockCount:1,records:[0,2].map((position,i)=>({position,actual:values[i],...(alternative?{alternative:true}:{})}))});
 return {program,completed,index:rows=>progression.collect(program,rows,core,history,3000)};
}
const movement={id:'cali-02',name:'Pompki',type:'reps',target:10,note:'',alternative:{id:'cali-29',name:'Pompki na kolanach',target:12}};
test('no history produces baseline; one deficient day recommends the lowest actually completed round',()=>{
 const f=progressionFixture(movement);
 assert.equal(progression.advise(movement,f.index([])).status,'baseline');
 const a=progression.advise(movement,f.index([f.completed(1,[9,7])]));
 assert.equal(a.status,'build');assert.equal(a.suggested,7);assert.equal(a.observations,1);assert.equal(a.last.count,2);
});
test('repeated deficits recommend defined easier movement; a completed alternative is not proof of base mastery',()=>{
 const f=progressionFixture(movement);
 const a=progression.advise(movement,f.index([f.completed(1,[9,8]),f.completed(2,[8,7])]));
 assert.equal(a.status,'caution');assert.equal(a.alternative,true);assert.equal(a.suggested,12);
 const b=progression.advise(movement,f.index([f.completed(1,[12,12],true)]));
 assert.equal(b.alternative,true);assert.equal(b.last,null);
});
test('two completed days meeting current target never increase the original schedule',()=>{
 const f=progressionFixture(movement),rows=[f.completed(1,[12,12]),f.completed(2,[11,12])];
 const before=JSON.stringify(rows),a=progression.advise(movement,f.index(rows));
 assert.equal(a.status,'ready');assert.equal(a.suggested,10);
 assert.equal(progression.advise({...movement,target:14},f.index(rows)).suggested,11);
 assert.equal(JSON.stringify(rows),before);
});
test('time, sides, pause and circuit position remain distinct; recovery and incomplete records excluded',()=>{
 const f=progressionFixture(movement),idx=f.index([f.completed(1,[10,10])]);
 for(const m of [{...movement,type:'duration'},{...movement,perSide:true},{...movement,pauseSeconds:2},{...movement,block:2},{...movement,note:'Powoli.'}]){
  assert.equal(progression.advise(m,idx).status,'baseline');
 }
 assert.equal(progression.advise({...movement,phase:'warmup'},idx),null);
 assert.equal(progression.advise(movement,f.index([{...f.completed(1,[10,10]),records:[]}])).status,'baseline');
 const recovery=progressionFixture(movement,'recovery');
 assert.equal(progression.advise(movement,recovery.index([recovery.completed(1,[10,10])])).status,'baseline');
 assert.equal(progression.advise(movement,f.index([{...f.completed(1,[10,10]),finishedAt:4000}])).status,'baseline');
});
test('estimated fatigue overrides readiness and never increases load',()=>{
 const f=progressionFixture(movement),idx=f.index([f.completed(1,[12,12]),f.completed(2,[12,12])]);
 const a=progression.advise(movement,idx,{muscle:'Klatka piersiowa',value:65});
 assert.equal(a.status,'caution');assert.equal(a.suggested,8);
 assert.equal(progression.advise(movement,idx,{muscle:'Klatka piersiowa',value:64}).status,'ready');
 const model=require('../preview/muscle-fatigue-core.js');
 const profile=[{id:'cali-29',group:'Kalistenika'}];
 assert.deepEqual(progression.relevantFatigue({id:'cali-29'},profile,model,{'Klatka piersiowa':20,Triceps:70,Barki:30,Brzuch:100}),{muscle:'Triceps',value:70});
 assert.equal(progression.relevantFatigue({id:'unknown'},profile,model,{}),null);
});
test('duration guidance preserves seconds and original timer target',()=>{
 const timed={id:'seed-14',name:'Deska',type:'duration',target:40};
 const f=progressionFixture(timed),idx=f.index([f.completed(1,[25,20])]);
 const a=progression.advise(timed,idx);
 assert.equal(a.suggested,20);assert.equal(a.target,40);assert.equal(timed.target,40);
});

test('release root modules and approved graphics match staging byte for byte',()=>{
 for(const path of ['modules/circuit-core.js','modules/programs-data.js','modules/program-history.js','modules/program-preparation.js','modules/calisthenics-progression.js','modules/programs-ui.mjs','styles/programs.css','calisthenics-library.js','calisthenics-icons.js','exercise-graphics.js','muscle-fatigue-core.js','summary-core.js','summary-ui.js',...Array.from({length:42},(_,i)=>'assets/graphics-r6/cali-'+(i+23)+'.webp')])assert.deepEqual(fs.readFileSync(path),fs.readFileSync('preview/'+path),path);
 const prod=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');assert.match(prod,/const key='moja-silownia-v01'/);assert.match(prod,/v4\.0\.0/);assert.match(sw,/moja-silownia-shell-v57-4\.0\.0-programs/);assert.ok(sw.includes("new URL('preview/',self.registration.scope)"));
});
