const test = require('node:test');
const assert = require('node:assert/strict');
const {prepare,repRange} = require('../assistant/trainer-preparation.js');
const exercise = {id:'bench',equipment:'Sztanga'};
const row = (weight,reps=12,rir=4,setType='W') => ({exerciseId:'bench',weight,reps,rir,setType});
const session = (sets,extra={}) => ({date:'2026-11-23T12:00:00Z',sets,...extra});
const target = {sets:4,reps:'8–12'};
const make = (sets, extra={}) => prepare({exercise,target,sessions:[session(sets)],...extra});
test('only repeatable top working sets progress; pyramid and warmup remain intact',()=>{
  const result=make([row(20,10,5,'R'),row(60),row(70),row(70)]);
  assert.deepEqual(result.rows.map(r=>r.weight),[20,60,72.5,72.5]);
  assert.deepEqual(result.rows.map(r=>r.reps),[10,12,8,8]);
  assert.equal(result.rows[0].setType,'R');
  assert.equal(result.rows[3].targetRir,2);
  assert.ok(result.rows.every(r=>!('rir' in r)));
});
test('single top set is not increased',()=>{
  assert.deepEqual(make([row(60),row(60),row(70)]).rows.map(r=>r.weight),[60,60,70,null]);
});
test('manual workout uses historical count',()=>{
  assert.equal(make([row(60),row(60)],{target:null}).rows.length,2);
});
test('missing history never invents weight',()=>{
  assert.deepEqual(prepare({exercise,target}).rows.map(r=>r.weight),[null,null,null,null]);
  assert.equal(prepare({exercise,target}).rows[0].reps,8);
});
test('explicit planned weight and repetitions are valid without history',()=>{
  assert.equal(prepare({exercise,target:{sets:2,reps:'10',weight:25}}).rows[0].weight,25);
});
test('pain or changed machine blocks automatic loading',()=>{
  for(const flag of ['pain','equipment','technique']){
    const result=make([row(70),row(70)],{activeFlag:flag});
    assert.ok(result.rows.every(r=>r.weight===null));
  }
});
test('recent pain also blocks prefill',()=>{
  const result=prepare({exercise,target,sessions:[session([row(70),row(70)],{exerciseNotes:{bench:{flag:'pain'}}})]});
  assert.equal(result.reason,'review');assert.equal(result.rows[0].weight,null);
});
test('poor readiness blocks increase',()=>{
  assert.equal(make([row(70),row(70)],{preWorkout:{battery:20}}).rows[0].weight,70);
});
test('missing actual RIR blocks progression',()=>{
  assert.equal(make([row(70,12,null),row(70,12,null)]).rows[0].weight,70);
});
test('recovery is not used as a normal reference',()=>{
  const sessions=[session([row(60),row(60)],{sessionMode:'recovery'}),session([row(70),row(70)],{date:'2026-11-21T12:00:00Z'})];
  assert.equal(prepare({exercise,target,sessions}).rows[0].weight,72.5);
  assert.equal(prepare({exercise,target,sessions,sessionMode:'recovery'}).rows[0].weight,60);
});
test('first recovery workout does not propose heavy standard weight',()=>{
  assert.equal(make([row(70),row(70)],{sessionMode:'recovery'}).rows[0].weight,null);
});
test('unknown equipment never increases',()=>{
  assert.equal(make([row(70),row(70)],{exercise:{id:'bench',equipment:'?'}}).rows[0].weight,70);
});
test('bodyweight history retains zero',()=>{
  assert.equal(make([row(0)],{exercise:{id:'bench',equipment:'Masa ciała'}}).rows[0].weight,0);
});
test('timed and unsupported rep prescriptions are not misread as repetitions',()=>{
  assert.equal(prepare({exercise,target:{sets:3,reps:'45–60 s'}}).rows[0].reps,null);
  assert.deepEqual(repRange('8–10/strona'),{min:8,max:10});
});
test('history, plan and exercise are not mutated',()=>{
  const input={exercise,target,sessions:[session([row(70),row(70)])]};
  const before=JSON.stringify(input);prepare(input);assert.equal(JSON.stringify(input),before);
});
test('set count bounded for malformed import',()=>{
  assert.equal(prepare({exercise,target:{sets:1000000,reps:'10'}}).rows.length,30);
});

test('plan with no explicit targets defaults to three rows when there is no history',()=>{assert.equal(prepare({exercise,slotIndex:0}).rows.length,3);});
test('pain note without a completed set still blocks automatic loading',()=>{const sessions=[session([],{exerciseNotes:{bench:{flag:'pain'}}}),session([row(70),row(70)],{date:'2026-11-20T12:00:00Z'})];assert.equal(prepare({exercise,target,sessions}).rows[0].weight,null);});
test('completed out-of-order plan rows retain their intended pyramid order',()=>{const rows=[{...row(70),planSetIndex:2,planSlotIndex:0,planId:17},{...row(20,15,5,'R'),planSetIndex:0,planSlotIndex:0,planId:17},{...row(60),planSetIndex:1,planSlotIndex:0,planId:17}];const result=prepare({exercise,target,sessions:[session(rows)],planId:17,slotIndex:0});assert.deepEqual(result.rows.slice(0,3).map(r=>r.weight),[20,60,70]);assert.equal(result.rows[0].reps,15);});
