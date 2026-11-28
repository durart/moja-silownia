'use strict';
// Baseline observations, not desired behavior. Run explicitly on verified 4.1.1 runtime only.
// A future fix must add target regression tests, not preserve these defect assertions.
const test=require('node:test');
const assert=require('node:assert/strict');
const now=Date.parse('2026-11-28T12:00:00Z');
const exercise=(id='seed-0',equipment='Sztanga')=>({id,group:'Klatka piersiowa',equipment});
const row=(extra={})=>({exerciseId:'seed-0',weight:70,reps:12,rir:2,setType:'W',...extra});
const sessions=(id='seed-0',weight=70)=>[0,4,8].map(days=>({date:new Date(now-days*86400000).toISOString(),sets:[0,1].map(i=>row({exerciseId:id,planId:'A',planSlotIndex:0,planSetIndex:i,weight,rir:3}))}));
const target={sets:2,reps:'8-12',rir:2};
for(const prefix of ['', 'preview/']){
 const progression=require('../'+prefix+'assistant/assistant-progression.js');
 const metrics=require('../'+prefix+'progress-core-v2.js');
 const fatigue=require('../'+prefix+'muscle-fatigue-core.js');
 const trainer=require('../'+prefix+'assistant/trainer-preparation.js');
 const adapter=require('../'+prefix+'assistant/adaptive-adapter.js');
 const drafts=require('../'+prefix+'assistant/trainer-drafts.js');
 const surface=prefix||'production/';
 const impulse=extra=>fatigue.impulse({sets:[row({weight:60,reps:10,...extra})]},[exercise()])['Klatka piersiowa'];
 test(surface+' A-10/DQ-006: legacy warmup differs across consumers',()=>{
  const legacy=row({setType:undefined,type:'R',reps:8});
  assert.equal(progression.workingSets({sets:[legacy]},'seed-0').length,0);
  assert.equal(metrics.working(legacy),true);
  assert.equal(fatigue.isWarmup(legacy),false);
 });
 test(surface+' A-11/DQ-003/004: empty and invalid RIR affect fatigue like zero',()=>{
  const zero=impulse({rir:0}),missing=impulse({rir:null});
  assert.equal(impulse({rir:''}),zero);
  assert.equal(impulse({rir:'invalid'}),zero);
  assert.ok(zero>missing);
  assert.equal(metrics.rirStatus(row({rir:''})),'missing');
 });
 test(surface+' DQ-001/004: boolean RIR accepted by metrics, excluded by progression',()=>{
  assert.equal(metrics.rirStatus(row({rir:true})),'valid');
  assert.equal(progression.workingSets({sets:[row({rir:true})]},'seed-0')[0].rir,null);
  assert.equal(metrics.rirStatus(row({rir:0})),'valid');
 });
 test(surface+' A-12/ML-007: repeated warmup same impulse, timed warmup reduced',()=>{
  assert.equal(impulse({setType:'R',rir:2}),impulse({setType:'W',rir:2}));
  const timed=type=>fatigue.impulse({sets:[{exerciseId:'seed-14',measurementType:'duration',durationSeconds:45,setType:type}]},[{id:'seed-14',group:'Brzuch'}]).Brzuch;
  assert.equal(timed('R'),timed('W')/2);
 });
 test(surface+' A-09/TM-001/002: e1RM qualification differs',()=>{
  const rows=[row({reps:12}),row({reps:10})];
  assert.ok(Math.abs(progression.calcSessionE1RM(rows)-(70*(1+14/30)+98)/2)<1e-8);
  assert.equal(metrics.estimateDetails(rows[0]).quality,'out_of_range');
  assert.equal(metrics.estimateDetails(rows[1]).value,98);
 });
 test(surface+' A-13/TM-004: unreliable row qualifies for report but not progression',()=>{
  const item=row({weight:100,reps:5,reliable:false});
  const history=[{date:new Date(now).toISOString(),sets:[item]}];
  const before=JSON.stringify(history);
  assert.equal(progression.workingSets(history[0],'seed-0').length,0);
  assert.equal(metrics.estimateDetails(item).quality,'comparable');
  assert.equal(metrics.records(history,'seed-0')[5].exact.weight,100);
  assert.equal(JSON.stringify(history),before);
 });
 test(surface+' A-23/PS-006: helper arbitrary equipment fallback versus explicit unknown',()=>{
  assert.equal(progression.resolveEquipmentType('unrecognized-machine',70),'barbell');
  assert.equal(progression.calculateNextWeight(70,'unrecognized-machine').suggestedWeight,72.5);
  assert.equal(progression.calculateNextWeight(70,'unknown').suggestedWeight,null);
 });
 test(surface+' A-16/PS-008: assisted pullup is treated as external-load machine',t=>{
  t.mock.timers.enable({apis:['Date'],now});
  const history=sessions('seed-28',40),before=JSON.stringify(history);
  const result=trainer.prepare({sessions:history,exercise:exercise('seed-28','Maszyna'),target,planId:'A',slotIndex:0});
  assert.equal(result.rows[0].weight,42.5);
  assert.equal(JSON.stringify(history),before);
 });
 test(surface+' A-15/PS-010: skipped latest slot blocks adapter but not older basic progression',t=>{
  t.mock.timers.enable({apis:['Date'],now});
  const history=sessions().map(s=>({...s,date:new Date(Date.parse(s.date)-86400000).toISOString()}));
  history.unshift({date:new Date(now).toISOString(),sets:[row({exerciseId:'other',planId:'A',planSlotIndex:1,planSetIndex:0})]});
  const before=JSON.stringify(history);
  const input={sessions:history,exercise:exercise(),target,planId:'A',slotIndex:0};
  assert.equal(adapter.evaluate({sessions:history,exerciseId:'seed-0',planId:'A',slotIndex:0,targets:[0,1].map(index=>({index,min:8,max:12,rir:2})),equipmentType:'barbell',now}),null);
  assert.equal(trainer.prepare(input).rows[0].weight,72.5);
  assert.equal(JSON.stringify(history),before);
 });
 test(surface+' A-26/PS-012: persisted draft ensure alone does not revalidate new pain flag',t=>{
  t.mock.timers.enable({apis:['Date'],now});
  const history=sessions(),state={startedAt:new Date(now).toISOString(),activePlan:'A',activeSessionMode:'standard',exercises:[exercise()],sessions:history};
  const before=JSON.stringify(history);
  drafts.initialize(state);
  assert.equal(drafts.ensure(state,'seed-0',0,target).entry.rows[0].weight,72.5);
  state.activeExerciseNotes={'seed-0':{flag:'pain'}};
  assert.equal(drafts.ensure(state,'seed-0',0,target).entry.rows[0].weight,72.5);
  assert.equal(trainer.prepare({sessions:history,exercise:exercise(),target,planId:'A',slotIndex:0,activeFlag:'pain'}).rows[0].weight,null);
  assert.equal(JSON.stringify(history),before);
  // This characterizes the draft API, not an actual UI bypass; UI caution may add a guard.
 });
 test(surface+' TM-003/A-08: total tonnage includes warmup; plan profile ignores sets',()=>{
  assert.equal(metrics.volume([row({weight:20,reps:10,setType:'R'}),row({weight:100,reps:5})]),700);
  assert.deepEqual(fatigue.planMuscles({exerciseIds:['seed-0'],targets:[{sets:2}]},[exercise()]),fatigue.planMuscles({exerciseIds:['seed-0'],targets:[{sets:4}]},[exercise()]));
 });
}
