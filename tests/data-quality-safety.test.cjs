'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const obs=require('../preview/modules/set-observation.js');
const progression=require('../preview/assistant/assistant-progression.js');
const trainer=require('../preview/assistant/trainer-preparation.js');
const metrics=require('../preview/progress-core-v2.js');
const fatigue=require('../preview/muscle-fatigue-core.js');
const timed=require('../preview/modules/timed-exercise-core.js');
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
 const {detectRecords}=await import('../preview/modules/records.js');
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
