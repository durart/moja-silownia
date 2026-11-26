import test from 'node:test';
import assert from 'node:assert/strict';
import preparation from '../assistant/trainer-preparation.js';
import drafts from '../assistant/trainer-drafts.js';
import ui from '../modules/timed-workout-ui.js';

const exercise={id:'seed-14',equipment:'Masa ciała'};
const target={sets:3,reps:'45–60 s'};
const slot={planId:17,slotIndex:0};
const set=(durationSeconds=45,index=0,extra={})=>({
  exerciseId:exercise.id,measurementType:'duration',durationSeconds,
  targetDurationSeconds:45,targetSetCount:3,setType:'W',weight:0,
  planId:17,planSlotIndex:0,planSetIndex:index,...extra
});
const session=(sets,extra={})=>({date:'2026-11-25T12:00:00Z',sets,...extra});
const rows=(...durations)=>durations.map((duration,i)=>set(duration,i));
const prepare=(sessions=[],extra={})=>preparation.prepare({exercise,target,...slot,sessions,...extra});
const times=result=>result.rows.map(r=>r.durationSeconds);

test('timed preparation starts from a plan target, without reps or RIR',()=>{
  const result=prepare();
  assert.deepEqual(times(result),[45,45,45]);
  assert.equal(result.reason,'timed_initial');
  assert.ok(result.rows.every(r=>r.weight===0&&r.targetDurationSeconds===45&&!('reps' in r)&&!('targetRir' in r)));
});
test('complete comparable work progresses by five seconds up to the plan limit',()=>{
  assert.deepEqual(times(prepare([session(rows(45,45,45))])),[50,50,50]);
  const sixty=rows(60,60,60).map(r=>({...r,targetDurationSeconds:60}));
  assert.deepEqual(times(prepare([session(sixty)])),[60,60,60]);
  assert.equal(prepare([session(sixty)]).reason,'timed_at_limit');
  assert.deepEqual(times(prepare([session(rows(45,45,45))],{target:{sets:3,reps:'45 s'}})),[45,45,45]);
});
test('missed, omitted, warmup-only and duplicated work cannot advance the target',()=>{
  for(const sets of [rows(45,40,30),rows(45,45),[...rows(45,45),set(45,2,{setType:'R'})],
    [set(45,0),set(45,0),set(45,1)],rows(45,45,45).map(r=>({...r,targetSetCount:4}))]){
    assert.deepEqual(times(prepare([session(sets)])),[45,45,45]);
  }
});
test('history is scoped to the exact plan and slot; legacy reps never count as seconds',()=>{
  const otherSlot=rows(45,45,45).map(r=>({...r,planSlotIndex:1}));
  assert.equal(prepare([session(otherSlot)]).reason,'timed_initial');
  const legacy={exerciseId:exercise.id,planId:17,planSlotIndex:0,reps:60,weight:0,rir:4};
  assert.equal(prepare([session([legacy])]).reason,'timed_initial');
  assert.deepEqual(times(prepare([session([...rows(45,45),legacy])])),[45,45,45]);
});
test('changed loading and differing per-row ranges do not trigger automatic progression',()=>{
  assert.deepEqual(times(prepare([session(rows(45,45,45))],{target:{...target,weight:5}})),[45,45,45]);
  const result=prepare([session(rows(45,45,45))],{target:{...target,setDetails:[{reps:'20 s',setType:'R'},{reps:'45 s'},{reps:'55 s'}]}});
  assert.deepEqual(times(result),[20,45,55]);
  assert.notEqual(result.reason,'timed_increase');
});
test('recovery is excluded from normal reference; caution blocks increases',()=>{
  const normal=session(rows(45,45,45));
  const recovery=session(rows(55,55,55),{date:'2026-11-26T12:00:00Z',sessionMode:'recovery'});
  assert.deepEqual(times(prepare([recovery,normal])),[50,50,50]);
  for(const extra of [{sessionMode:'recovery'},{activeFlag:'pain'},{preWorkout:{sleepHours:4}}])
    assert.deepEqual(times(prepare([normal],extra)),[45,45,45]);
  const note=session([],{date:'2026-11-26T12:00:00Z',exerciseNotes:{[exercise.id]:{flag:'technique'}}});
  assert.equal(prepare([note,normal]).reason,'timed_review');
});
test('free workout uses a default range and prior explicit set count; no inferred legacy prescription',()=>{
  const manual=rows(30,30,30).map((r,i)=>({...r,planId:undefined,planSlotIndex:undefined,planSetIndex:undefined,
    manualSetIndex:i,targetDurationSeconds:30}));
  const free={target:null,planId:null,slotIndex:null};
  assert.deepEqual(times(prepare([session(manual)],free)),[35,35,35]);
  assert.deepEqual(times(prepare([session(manual.slice(0,2))],free)),[30,30,30]);
  const ambiguous=manual.map(({targetSetCount,...r})=>r);
  assert.deepEqual(times(prepare([session(ambiguous)],free)),[30,30,30]);
});
function state(){return {startedAt:'2026-11-26T12:00:00Z',activeSessionMode:'standard',active:[],
  activePlan:17,exercises:[exercise],sessions:[session(rows(45,45,45))]};}
test('timed trainer drafts persist actual edits and preserve the prescribed goal',()=>{
  const s=state(),before=JSON.stringify(s.sessions);
  drafts.initialize(s);drafts.ensure(s,exercise.id,0,target);
  assert.equal(drafts.row(s,exercise.id,0,0).durationSeconds,50);
  assert.equal(drafts.change(s,exercise.id,0,0,'durationSeconds','42'),true);
  assert.equal(drafts.change(s,exercise.id,0,0,'rir','2'),false);
  assert.equal(drafts.change(s,exercise.id,0,0,'reps','12'),false);
  const restored=JSON.parse(JSON.stringify(s));
  assert.equal(drafts.row(restored,exercise.id,0,0).durationSeconds,42);
  assert.equal(drafts.row(restored,exercise.id,0,0).targetDurationSeconds,50);
  restored.activeSessionMode='recovery';
  drafts.refreshMode(restored,exercise.id,0,target);
  assert.equal(drafts.row(restored,exercise.id,0,0).durationSeconds,42);
  assert.equal(drafts.row(restored,exercise.id,0,1).durationSeconds,45);
  assert.equal(JSON.stringify(restored.sessions),before);
});
test('disabled autofill and explicitly cleared seconds remain blank',()=>{
  const s=state();s.trainerSettings={reps:false};
  drafts.initialize(s);drafts.ensure(s,exercise.id,0,target);
  const row=drafts.row(s,exercise.id,0,0);
  assert.equal(row.durationSeconds,null);
  assert.equal(row.targetDurationSeconds,50);
  assert.equal(ui.durationValue({draftSeconds:null,targetSeconds:50}), '');
});
test('legacy active drafts are safely upgraded without converting reps or changing history',()=>{
  const s=state();drafts.initialize(s);
  s.trainerWorkout.entries['slot:0']={exerciseId:exercise.id,mode:'standard',rows:[
    {reps:99,rir:3,weight:0,edited:true},{reps:12,weight:0},{reps:12,weight:0}]};
  const completed=[{exerciseId:exercise.id,reps:99,weight:0}];
  assert.equal(drafts.ensure(s,exercise.id,0,target,completed).changed,true);
  assert.equal(drafts.row(s,exercise.id,0,0).durationSeconds,null);
  assert.equal(drafts.row(s,exercise.id,0,1).durationSeconds,50);
  assert.equal(drafts.ensure(s,exercise.id,0,target,completed).changed,false);
  assert.equal(completed[0].reps,99);
});
