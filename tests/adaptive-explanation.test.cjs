'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {explain}=require('../assistant/adaptive-explanation.js');
test('three comparable observations give moderate confidence',()=>assert.deepEqual(explain({reason:'increase_weight',observations:3,comparable:true}),{reason:'increase_weight',observations:3,confidence:'moderate'}));
test('four comparable observations give high confidence',()=>assert.equal(explain({reason:'increase_reps',observations:4,comparable:true}).confidence,'high'));
test('missing comparable evidence never implies confidence',()=>assert.equal(explain({reason:'maintain',observations:6}).confidence,'low'));
test('safety review is not a performance prediction',()=>assert.equal(explain({reason:'review',observations:6,comparable:true}).confidence,'low'));
test('unknown reasons and invalid counts fail closed',()=>assert.deepEqual(explain({reason:'__proto__',observations:99,comparable:true}),{reason:'insufficient_data',observations:0,confidence:'low'}));
