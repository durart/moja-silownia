const assert=require('node:assert/strict');const test=require('node:test');const C=require('../progress-core-v2.js');
const s=(date,sets)=>({date,sets:sets.map(([weight,reps])=>({exerciseId:'bench',weight,reps,rir:0}))});
const history=[s('2026-10-01T10:00:00',[ [60,12] ]),s('2026-10-08T10:00:00',[[65,12]]),s('2026-10-15T10:00:00',[[67.5,12]]),s('2026-10-22T10:00:00',[[70,12]]),s('2026-10-29T10:00:00',[[72.5,12]]),s('2026-11-05T10:00:00',[[75,12]])];
test('1RM Epley and invalid zero weight',()=>{assert.equal(C.estimatedRM({exerciseId:'x',weight:70,reps:12}),98);assert.equal(C.estimatedRM({exerciseId:'x',weight:0,reps:12}),null)});
test('compare last two sessions, not all sessions',()=>{const r=C.compare(history,'bench');assert.equal(r.previous.max,72.5);assert.equal(r.latest.max,75);assert.equal(r.delta.max.absolute,2.5)});
test('record exact and at least',()=>{const r=C.records(history,'bench');assert.equal(r[12].exact.weight,75);assert.equal(r[10].atLeast.weight,75);assert.equal(r[8].exact,null)});
test('trend up and insufficient',()=>{assert.equal(C.trend(history,'bench').kind,'up');assert.equal(C.trend(history.slice(0,2),'bench').kind,'insufficient')});
test('monthly report and read only',()=>{const raw=JSON.stringify(history),r=C.monthReport(history,2026,10);assert.equal(r.count,5);assert.equal(r.sets,5);assert.equal(r.prs,5);assert.equal(JSON.stringify(history),raw)});
test('missing dates and malformed sets ignored',()=>{const h=[{date:'invalid',sets:[{exerciseId:'bench',weight:100,reps:10}]},s('2026-11-06T10:00:00',[[0,12]]),{date:'2026-11-07T10:00:00',sets:[{exerciseId:'bench',weight:'',reps:10}]}];assert.equal(C.exerciseSessions(h,'bench').length,1);assert.equal(C.exerciseSessions(h,'bench')[0].oneRM,null)});
test('month boundaries',()=>{assert.equal(C.monthReport(history,2026,11).count,1);assert.equal(C.monthReport(history,2026,9).count,0)});

test('RIR classification never silently clamps invalid input',()=>{
  const base={exerciseId:'bench',weight:70,reps:8};
  assert.equal(C.estimateDetails({...base,rir:2}).quality,'comparable');
  assert.ok(Math.abs(C.estimateDetails({...base,rir:2}).value-93.3333333333)<0.001);
  assert.equal(C.estimateDetails(base).quality,'indicative');
  assert.equal(C.estimateDetails({...base,rir:6}).quality,'invalid_rir');
  assert.equal(C.estimateDetails({...base,rir:-1}).value,null);
  assert.equal(C.estimateDetails({...base,rir:1.5}).value,null);
  assert.equal(C.estimateDetails({...base,reps:12,rir:2}).quality,'out_of_range');
});
test('recovery sessions and missing RIR do not produce false strength trends',()=>{
  const regular=history.map(x=>({...x,sets:x.sets.map(y=>({...y}))}));
  const recovery={...s('2026-11-12T10:00:00',[[30,10]]),sessionMode:'recovery'};
  const indicative={...s('2026-11-19T10:00:00',[[40,8]])};
  delete indicative.sets[0].rir;
  assert.equal(C.trend([...regular,recovery,indicative],'bench').kind,'up');
  assert.equal(C.exerciseSessions([recovery],'bench')[0].comparableOneRM,null);
  assert.equal(C.exerciseSessions([indicative],'bench')[0].comparableOneRM,null);
});

test('recovery remains visible in totals but cannot create a new strength PR',()=>{
  const base=s('2026-11-01T10:00:00',[[70,10]]);
  const deload={...s('2026-11-03T10:00:00',[[100,10]]),sessionMode:'recovery'};
  const report=C.monthReport([base,deload],2026,11);
  assert.equal(report.count,2);
  assert.equal(report.prs,1);
  assert.equal(C.records([base,deload],'bench')[10].exact.weight,70);
});
test('bodyweight zero-load repetitions are retained without fictitious e1RM',()=>{
  const pushups={date:'2026-11-04T10:00:00',sets:[{exerciseId:'pushups',weight:0,reps:20,rir:2}]};
  const row=C.exerciseSessions([pushups],'pushups')[0];
  assert.equal(row.max,0);
  assert.equal(row.oneRM,null);
  assert.equal(row.sets[0].reps,20);
});

test('bodyweight summary uses repetitions and excludes recovery from best',()=>{
  const sessions=[
    {date:'2026-10-01T10:00:00',sets:[{exerciseId:'pushups',weight:0,reps:12},{exerciseId:'pushups',weight:0,reps:10}]},
    {date:'2026-10-08T10:00:00',sessionMode:'recovery',sets:[{exerciseId:'pushups',weight:0,reps:30}]},
    {date:'2026-10-15T10:00:00',sets:[{exerciseId:'pushups',weight:0,reps:14}]}
  ];
  const result=C.bodyweightSummary(sessions,'pushups');
  assert.equal(result.bestReps,14);
  assert.equal(result.sessions[0].totalReps,22);
  assert.equal(result.sessions[1].sessionMode,'recovery');
  assert.equal(result.lastStandard.bestReps,14);
});
test('training breaks use calendar elapsed days and skip recovery sessions',()=>{
  const rows=[
    s('2026-10-01T10:00:00',[[50,8]]),
    {...s('2026-10-10T10:00:00',[[30,10]]),sessionMode:'recovery'},
    s('2026-10-20T10:00:00',[[50,8]]),
    s('2026-10-27T10:00:00',[[50,8]])
  ];
  const breaks=C.trainingBreaks(rows);
  assert.equal(breaks.length,1);
  assert.equal(breaks[0].elapsedDays,19);
  assert.equal(C.trainingBreaks(rows,{minDays:21}).length,0);
  assert.equal(C.trainingBreaks([]).length,0);
});
