'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const prefix=process.env.SAFETY_SURFACE==='production'?'':'preview/';
const obs=require('../'+prefix+'modules/set-observation.js');
const progression=require('../'+prefix+'assistant/assistant-progression.js');
const trainer=require('../'+prefix+'assistant/trainer-preparation.js');
const metrics=require('../'+prefix+'progress-core-v2.js');
const fatigue=require('../'+prefix+'muscle-fatigue-core.js');
const timed=require('../'+prefix+'modules/timed-exercise-core.js');
const row=(extra={})=>({exerciseId:'seed-0',weight:70,reps:12,rir:2,setType:'W',...extra});
const ex={id:'seed-0',name:'Bench',group:'Klatka piersiowa',equipment:'Sztanga'};
const session=sets=>({date:'2026-11-20T12:00:00Z',sets});
const impulse=extra=>fatigue.impulse(session([row({weight:60,reps:10,...extra})]),[ex])['Klatka piersiowa'];
test('DQ-001–004: zero, missing and invalid RIR are distinct',()=>{
 for(const value of [0,'0',5,'5'])assert.equal(obs.rir(value).status,'valid');
 for(const value of [undefined,null,'','  '])assert.deepEqual(obs.rir(value),{status:'missing',value:null});
 for(const value of [true,false,[],{},-1,8,2.5,'no',Infinity,NaN])assert.deepEqual(obs.rir(value),{status:'invalid',value:null});
 assert.equal(metrics.rirStatus(row({rir:true})),'invalid');
 assert.equal(progression.workingSets(session([row({rir:true})]),ex.id)[0].rir,null);
 assert.equal(impulse({rir:''}),impulse({rir:null}));
 assert.equal(impulse({rir:'invalid'}),impulse({rir:null}));
 assert.ok(impulse({rir:0})>impulse({rir:null}));
});
test('DQ-005–008: one classification for working, legacy warmup and conflict',()=>{
 for(const value of [{setType:'R'},{type:'R'},{type:'warmup'}]){
  const item=row({setType:undefined,...value});
  assert.equal(obs.setClass(item),'warmup');
  assert.equal(progression.workingSets(session([item]),ex.id).length,0);
  assert.equal(metrics.working(item),false);
  assert.equal(fatigue.isWarmup(item),true);
 }
 assert.equal(obs.setClass({}),'working');
 assert.equal(obs.setClass({setType:'W',type:'R'}),'conflict');
 assert.equal(obs.setClass({setType:'x'}),'unknown');
 assert.equal(metrics.working(row({type:'R'})),false);
});
test('ML-007: neutral invalid RIR and warmup reduction in derived load',()=>{
 assert.equal(impulse({setType:'R'}),impulse({setType:'W'})/2);
 assert.equal(impulse({rir:8}),impulse({rir:null}));
 const item={exerciseId:'seed-14',measurementType:'duration',durationSeconds:45,weight:0,type:'R'};
 assert.equal(timed.workingTimedSets(session([item]),item.exerciseId).length,0);
});
test('DQ-009/TM-004: unreliable row remains stored but cannot create trusted PR or e1RM',()=>{
 const bad=row({weight:100,reps:5,reliable:false});
 const history=[session([bad,row({weight:60,reps:5})])];
 const before=JSON.stringify(history);
 assert.equal(progression.workingSets(history[0],ex.id).length,1);
 assert.equal(metrics.estimatedRM(bad),null);
 assert.equal(metrics.records(history,ex.id)[5].exact.weight,60);
 assert.equal(metrics.exerciseSessions(history,ex.id)[0].volume,800);
 assert.equal(JSON.stringify(history),before);
});
test('DQ-010: invalid measurements cannot masquerade as zero or one rep',()=>{
 for(const extra of [{weight:true},{reps:true},{weight:-1},{reps:0},{reps:1.2},{weight:Infinity},{weight:' '}]){
  const item=row(extra);
  assert.equal(obs.validRepetitions(item),false);
  assert.equal(metrics.validSet(item),false);
  assert.equal(progression.workingSets(session([item]),ex.id).length,0);
 }
});
test('PS-006/007: no default barbell for unknown equipment or invalid explicit step',()=>{
 for(const equipment of [undefined,null,'unknown','unrecognized-machine','constructor','__proto__']){
  assert.equal(progression.resolveEquipmentType(equipment,70),'unknown');
  assert.equal(progression.calculateNextWeight(70,equipment).suggestedWeight,null);
 }
 for(const step of [false,0,-1,'bad',Infinity,21,0.001]){
  assert.equal(progression.calculateNextWeight(70,'barbell',step).suggestedWeight,null);
 }
 assert.equal(progression.calculateNextWeight(70,'barbell').suggestedWeight,72.5);
 assert.equal(progression.calculateNextWeight(20,'barbell',5).suggestedWeight,null);
});
test('PS-008: assisted exercise cannot receive ordinary weight progression or strength PR',()=>{
 const id='seed-28',exercise={id,equipment:'Maszyna'};
 const history=[session([row({exerciseId:id,weight:40,rir:4}),row({exerciseId:id,weight:40,rir:4})])];
 const before=JSON.stringify(history);
 assert.equal(progression.suggest(history,id,{equipmentType:'machine_stack'}).action,'review');
 assert.equal(trainer.prepare({sessions:history,exercise,target:{sets:2,reps:'8-12',rir:2}}).rows[0].weight,null);
 assert.equal(metrics.estimatedRM(history[0].sets[0]),null);
 assert.equal(metrics.records(history,id)[12].exact,null);
 assert.equal(JSON.stringify(history),before);
});
test('live records ignore unreliable, recovery, assisted and legacy warmup rows',async()=>{
 const {detectRecords}=await import('../'+prefix+'modules/records.js');
 const completedSessions=[session([row({weight:100,rir:1,reliable:false}),row({weight:60}),row({weight:120,setType:undefined,type:'R'})]),{...session([row({weight:110})]),sessionMode:'recovery'}];
 const args={exerciseId:ex.id,weight:70,reps:12,completedSessions};
 assert.ok(detectRecords(args).includes('Ciężar'));
 assert.deepEqual(detectRecords({...args,sessionMode:'recovery'}),[]);
 assert.deepEqual(detectRecords({...args,exerciseId:'seed-28'}),[]);
});
test('candidate modules and immutable raw records: valid standard progression still works',()=>{
 const history=[session([row({rir:4}),row({rir:4})])];
 const before=JSON.stringify(history);
 const result=trainer.prepare({sessions:history,exercise:ex,target:{sets:2,reps:'8-12',rir:2}});
 assert.equal(result.rows[0].weight,72.5);
 assert.equal(JSON.stringify(history),before);
});

const safety=require('../'+prefix+'assistant/recommendation-safety.js');
const drafts=require('../'+prefix+'assistant/trainer-drafts.js');
const planTarget={sets:2,reps:'8-12',rir:2};
const planRow=(i,extra={})=>row({planId:'A',planSlotIndex:0,planSetIndex:i,rir:4,...extra});
const planHistory=()=>[session([planRow(0),planRow(1)])];
test('PS-010: skipped, replaced, incomplete or unreliable latest slot blocks fallback',()=>{
 const prior=planHistory();
 const attempts=[
  [planRow(0,{exerciseId:'other',planSlotIndex:1})],
  [planRow(0,{exerciseId:'other'}),planRow(1,{exerciseId:'other'})],
  [planRow(0)],
  [planRow(0),planRow(1,{reliable:false})],
  [planRow(0),planRow(1,{rir:null})]
 ];
 for(const sets of attempts){
  const history=[...prior,{date:'2026-11-24T12:00:00Z',sets}];
  const before=JSON.stringify(history);
  const result=trainer.prepare({sessions:history,exercise:ex,planId:'A',slotIndex:0,target:planTarget});
  assert.notEqual(result.advice.action,'consider_increase');
  assert.ok(result.rows.every(r=>r.weight===null||r.weight<=70));
  assert.equal(JSON.stringify(history),before);
 }
});
test('PS-010: exact comparable plan still progresses; another plan cannot override its load',()=>{
 const history=[...planHistory(),{date:'2026-11-24T12:00:00Z',sets:[planRow(0,{planId:'B',weight:100}),planRow(1,{planId:'B',weight:100})]}];
 const result=trainer.prepare({sessions:history,exercise:ex,planId:'A',slotIndex:0,target:planTarget});
 assert.equal(result.rows[0].weight,72.5);
 const missing=trainer.prepare({sessions:history,exercise:ex,planId:'C',slotIndex:0,target:planTarget});
 assert.notEqual(missing.advice.action,'consider_increase');
});
test('PS-004/011/012: current restrictions are identical in recommendation gate',()=>{
 assert.equal(safety.currentBlock({exercise:ex,activeFlag:'pain'}),'flag');
 assert.equal(safety.currentBlock({exercise:ex,sessionMode:'recovery'}),'recovery');
 assert.equal(safety.currentBlock({exercise:ex,preWorkout:{sleepHours:4}}),'readiness');
 assert.equal(safety.currentBlock({exercise:ex,sessionMode:'unknown'}),'invalid_mode');
 assert.equal(safety.currentBlock({exercise:{id:'seed-28'}}),'assisted');
 assert.equal(safety.currentBlock({exercise:ex} ),null);
});
test('PS-011/012/013/014: restored draft revalidates without overwriting edited or completed rows',()=>{
 const state={startedAt:'2026-11-25T12:00:00Z',activePlan:'A',activeSessionMode:'standard',exercises:[ex],sessions:planHistory()};
 const raw=JSON.stringify(state.sessions);
 drafts.initialize(state);
 assert.equal(drafts.ensure(state,ex.id,0,planTarget).entry.rows[0].weight,72.5);
 assert.equal(drafts.ensure(state,ex.id,0,planTarget).changed,false);
 drafts.change(state,ex.id,0,0,'weight','65');
 const restored=JSON.parse(JSON.stringify(state));
 restored.activeExerciseNotes={[ex.id]:{flag:'pain'}};
 const entry=drafts.ensure(restored,ex.id,0,planTarget).entry;
 assert.equal(entry.rows[0].weight,65);
 assert.equal(entry.rows[1].weight,null);
 assert.equal(JSON.stringify(restored.sessions),raw);
 delete restored.activeExerciseNotes;
 restored.preWorkout={sleepHours:4};
 const after=drafts.ensure(restored,ex.id,0,planTarget).entry;
 assert.equal(after.rows[0].weight,65);
 assert.ok(after.rows[1].weight===null||after.rows[1].weight<=70);
 restored.activeSessionMode='recovery';
 const recovered=drafts.ensure(restored,ex.id,0,planTarget).entry;
 assert.equal(recovered.rows[0].weight,65);
 assert.equal(recovered.mode,'recovery');
 assert.ok(recovered.rows[1].weight===null||recovered.rows[1].weight<=70);
});
test('PS-005: changed exercise step invalidates untouched increased draft',()=>{
 const state={startedAt:'2026-11-25T12:00:00Z',activePlan:'A',activeSessionMode:'standard',exercises:[{...ex}],sessions:planHistory()};
 drafts.initialize(state);
 assert.equal(drafts.ensure(state,ex.id,0,planTarget).entry.rows[0].weight,72.5);
 state.exercises[0].equipmentStepKg=20;
 const next=drafts.ensure(state,ex.id,0,planTarget).entry;
 assert.equal(next.rows[0].weight,null);
});
test('PS-003: invalid latest observation cannot be skipped to escalate from older history',()=>{
 const history=[session([row({rir:4}),row({rir:4})]),{date:'2026-11-24T12:00:00Z',sets:[row({rir:4,reliable:false})]}];
 assert.notEqual(progression.suggest(history,ex.id,{equipmentType:'barbell'}).action,'consider_increase');
});

test('PS-005: equipment change with same increment is sticky and preserves edited rows',()=>{
 const state={startedAt:'2026-11-25T12:00:00Z',activePlan:'A',activeSessionMode:'standard',exercises:[{...ex}],sessions:planHistory()};
 drafts.initialize(state);drafts.ensure(state,ex.id,0,planTarget);drafts.change(state,ex.id,0,0,'weight','65');
 state.exercises[0].equipmentType='machine_stack';state.exercises[0].equipmentStepKg=2.5;
 let next=drafts.ensure(state,ex.id,0,planTarget).entry;assert.equal(next.rows[0].weight,65);assert.equal(next.rows[1].weight,null);assert.equal(next.equipmentChanged,true);
 const restored=JSON.parse(JSON.stringify(state));next=drafts.ensure(restored,ex.id,0,planTarget).entry;assert.equal(next.rows[1].weight,null);
});
test('summary excludes untrusted record flags and normalizes RIR without rewriting raw data',()=>{
 require('../'+prefix+'summary-core.js');const summary=globalThis.SportSummaryCore;
 const input=session([row({reliable:false,pr:['Ciężar'],rir:'invalid'}),row({setType:'R',pr:['Ciężar'],rir:null}),row({pr:['Ciężar'],rir:0})]);const before=JSON.stringify(input);const model=summary.build(input);assert.equal(model.prCount,1);assert.equal(model.groups[0].sets[0].rir,null);assert.equal(model.groups[0].sets[2].rir,0);assert.equal(JSON.stringify(input),before);
});
test('timed progression cannot bypass invalid latest observation',()=>{
 const id='seed-14',r={exerciseId:id,measurementType:'duration',durationSeconds:45,targetDurationSeconds:45,weight:0,setType:'W'};
 const history=[session([r,r]),{date:'2026-11-24T12:00:00Z',sets:[r,{...r,reliable:false}]}];
 assert.equal(timed.suggestDuration(history,id,{expectedSets:2,previousTargetSeconds:45,target:{minSeconds:30,maxSeconds:60}}).action,'maintain');
});

const recent=(sets,extra={})=>({date:'2026-11-25T12:00:00Z',sets,...extra});
const prepareFree=(sessions,extra={})=>trainer.prepare({sessions,exercise:ex,...extra});
test('alpha.6: latest completed plan row is free-workout reference, not older unscoped warmup',()=>{
 const old=session([row({weight:20,reps:10,setType:'R'}),row({weight:70}),row({weight:70})]);
 const latest=recent([planRow(2,{weight:65,reps:9,rir:1})]);
 const input=[old,latest],before=JSON.stringify(input);
 const result=prepareFree(input);
 assert.equal(result.rows[0].weight,65);assert.equal(result.rows[0].reps,9);assert.equal(result.rows[0].setType,'W');
 assert.equal(result.safetyReason,'different_context');assert.equal(result.advice.suggestedWeight,null);
 assert.equal(JSON.stringify(input),before);
});
test('alpha.6: latest planned reference cannot authorize weight or repetition escalation',()=>{
 const input=[session([row({rir:4}),row({rir:4})]),recent([planRow(0,{weight:65,reps:10}),planRow(1,{weight:65,reps:10})])];
 const result=prepareFree(input,{target:planTarget});
 assert.deepEqual(result.rows.map(r=>[r.weight,r.reps]),[[65,10],[65,10]]);
 assert.equal(result.advice.action,'maintain');
});
test('alpha.6: explicit manual observations remain eligible, legacy does not join that evidence',()=>{
 const manual=i=>row({manualSetIndex:i,rir:4});
 const result=prepareFree([session([row({weight:90}),row({weight:90})]),recent([manual(0),manual(1)])],{target:planTarget});
 assert.equal(result.rows[0].weight,72.5);assert.equal(result.safetyReason,null);
 assert.equal(safety.manualHistory([session([row()]),recent([manual(0),manual(1)])],ex.id).history.length,1);
});
test('alpha.6: newer unscoped data after explicit plan or manual context is reference only',()=>{
 for(const old of [planRow(0),row({manualSetIndex:0})]){
  const result=prepareFree([session([old]),recent([row({weight:60,rir:4}),row({weight:60,rir:4})])],{target:planTarget});
  assert.equal(result.rows[0].weight,60);assert.equal(result.advice.suggestedWeight,null);assert.equal(result.safetyReason,'different_context');
 }
});
test('alpha.6: same-session ambiguous slots or mixed manual/plan rows cannot authorize progression',()=>{
 for(const rows of [[planRow(0),planRow(1,{planSlotIndex:1})],[planRow(0),row({manualSetIndex:0})],[row({planSetIndex:1}),row()]]){
  const result=prepareFree([recent(rows)],{target:planTarget});
  assert.ok(result.rows.every(r=>r.weight===null));assert.equal(result.advice.suggestedWeight,null);
 }
});
test('alpha.6: invalid latest manual set and warmup-only attempt block older evidence',()=>{
 const old=session([row({manualSetIndex:0,rir:4}),row({manualSetIndex:1,rir:4})]);
 for(const rows of [[row({manualSetIndex:0,reliable:false})],[row({manualSetIndex:0,setType:'R',weight:20})],[row({manualSetIndex:0,rir:null})]]){
  const result=prepareFree([old,recent(rows)],{target:planTarget});
  assert.notEqual(result.advice.action,'consider_increase');assert.equal(result.advice.suggestedWeight,null);
 }
});
test('alpha.6: future and recovery observations cannot displace standard reference',()=>{
 const latest=recent([planRow(0,{weight:65,reps:9,rir:1})]);
 const future={date:'2099-01-01T00:00:00Z',sets:[row({weight:200,manualSetIndex:0})]};
 const recovery={date:'2026-11-26T12:00:00Z',sessionMode:'recovery',sets:[row({weight:30,manualSetIndex:0})]};
 const result=prepareFree([latest,future,recovery]);assert.equal(result.rows[0].weight,65);assert.equal(result.advice.suggestedWeight,null);
});
test('alpha.6: pure legacy history retains compatible behavior; explicit manual history cannot increase another plan',()=>{
 assert.equal(prepareFree([session([row({rir:4}),row({rir:4})])],{target:planTarget}).rows[0].weight,72.5);
 const result=trainer.prepare({sessions:[recent([row({manualSetIndex:0}),row({manualSetIndex:1})])],exercise:ex,target:planTarget,planId:'A',slotIndex:0});
 assert.equal(result.rows[0].weight,70);assert.equal(result.advice.suggestedWeight,null);
});
