'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { analyze } = require('../assistant/adaptive-evidence.js');
const now = Date.parse('2026-11-27T12:00:00Z');
const opts = { now, expectedWorkingSets: 2 };
const row = (weight, reps = 10, rir = 2) => ({ exerciseId: 'bench', weight, reps, rir, setType: 'W' });
const session = (day, rows = [row(70), row(65)]) => ({ date: new Date(now-day*86400000).toISOString(), sets: rows });
test('comparable pyramid evidence is ordered and immutable', () => {
  const data = [session(8), session(0), session(4)];
  const before = JSON.stringify(data);
  const result = analyze(data,'bench',opts);
  assert.equal(result.status,'comparable');
  assert.equal(result.observations,3);
  assert.equal(result.samples[0].date,session(0).date);
  assert.equal(JSON.stringify(data),before);
});
test('recovery and future sessions are excluded', () => {
  const result = analyze([session(-1), {...session(1),sessionMode:'recovery'},session(2),session(4)],'bench',opts);
  assert.equal(result.observations,2);
});
test('changed pyramid order stops comparability', () => {
  assert.equal(analyze([session(0),session(4,[row(65),row(70)]),session(8)],'bench',opts).observations,1);
});
test('missing RIR and unreliable rows cannot establish evidence', () => {
  assert.equal(analyze([session(0,[row(70,10,null),row(65)])],'bench',opts).observations,0);
  assert.equal(analyze([session(0,[{...row(70),reliable:false},row(65)])],'bench',opts).observations,0);
});
test('duplicate timestamps and stale history stop evidence', () => {
  assert.equal(analyze([session(0),session(0),session(4)],'bench',opts).observations,1);
  assert.equal(analyze([session(0),session(43)],'bench',opts).observations,1);
});
test('bodyweight and invalid options are not strength evidence', () => {
  assert.equal(analyze([session(0,[row(0),row(0)])],'bench',opts).observations,0);
  assert.equal(analyze([session(0)],'bench',{}).observations,0);
});
