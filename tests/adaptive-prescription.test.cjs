'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {prescribe} = require('../assistant/adaptive-prescription.js');
const row=(weight,reps,rir=3)=>({weight,reps,rir});
const target={min:8,max:12,rir:2};
const input={samples:[[row(70,12),row(65,10)],[row(70,12),row(65,9)],[row(70,12),row(65,8)]],targets:[target,target],equipmentType:'barbell'};
test('each pyramid position progresses independently',()=>{
  const before=JSON.stringify(input);
  assert.deepEqual(prescribe(input),[{weight:72.5,reps:8,reason:'increase_weight'},{weight:65,reps:11,reason:'increase_reps'}]);
  assert.equal(JSON.stringify(input),before);
});
test('caution blocks every increase',()=>assert.ok(prescribe({...input,caution:true}).every(r=>r.reason==='maintain')));
test('unknown equipment blocks weight increase',()=>assert.equal(prescribe({...input,equipmentType:'unknown'})[0].weight,70));
test('insufficient evidence is rejected',()=>assert.equal(prescribe({...input,samples:input.samples.slice(0,2)}),null));
test('missing RIR is rejected',()=>assert.equal(prescribe({...input,samples:[[row(70,12,null),row(65,10)],...input.samples.slice(1)]}),null));
test('large equipment step is blocked',()=>assert.equal(prescribe({...input,equipmentStepKg:20})[0].weight,70));
test('changed weight or declining repetitions block progression',()=>{
 const samples=[[row(70,12),row(65,9)],[row(75,12),row(65,10)],[row(70,12),row(65,11)]];
 assert.ok(prescribe({...input,samples}).every(r=>r.reason==='maintain'));
});
