const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const advisor = require('../assistant/assistant-progression.js');
const exerciseId = 'rowing-v';
const dates = ['2026-11-23T08:00:00Z','2026-11-18T08:00:00Z','2026-11-13T08:00:00Z'];
const row = (weight, reps, rir, setType = 'W') => ({ exerciseId, weight, reps, rir, setType });
const session = (date, rows, flag) => ({
  date, sets: rows,
  ...(flag ? { exerciseNotes: { [exerciseId]: { flag } } } : {})
});
const sets = (weight, reps, rirs) => rirs.map(rir => row(weight, reps, rir));
const evaluate = (items, equipmentType = 'barbell') =>
  advisor.suggest(items, exerciseId, { minReps: 8, maxReps: 12, equipmentType });

test('one obviously underloaded workout opens fast progression', () => {
  const result = evaluate([session(dates[0], sets(60, 12, [4, 4, 3]))]);
  assert.equal(result.action, 'consider_increase');
  assert.equal(result.path, 'FAST_TRACK_1_SESSION');
  assert.equal(result.suggestedWeight, 62.5);
});

test('fast progression does not override a hard final set', () => {
  const result = evaluate([session(dates[0], sets(60, 12, [5, 5, 0]))]);
  assert.equal(result.action, 'maintain');
});

test('two comparable FBW sessions accept integer RIR 3/3/2', () => {
  const result = evaluate([
    session(dates[0], sets(60, 12, [3, 3, 2])),
    session(dates[1], sets(60, 12, [2, 2, 2]))
  ]);
  assert.equal(result.action, 'consider_increase');
  assert.equal(result.path, 'ACCELERATED_2_SESSIONS');
});

test('two sessions with inadequate reserve do not progress', () => {
  const result = evaluate([
    session(dates[0], sets(60, 12, [2, 2, 2])),
    session(dates[1], sets(60, 12, [2, 2, 2]))
  ]);
  assert.equal(result.action, 'maintain');
});

test('three full sessions at RIR 2 take the standard path', () => {
  const result = evaluate(dates.map(date => session(date, sets(60, 12, [2, 2, 2]))));
  assert.equal(result.path, 'STANDARD_3_SESSIONS');
});

test('e1RM trend can open progression after gradually improving repetitions', () => {
  const result = evaluate([
    session(dates[0], sets(60, 12, [2, 2, 2])),
    session(dates[1], sets(60, 10, [2, 2, 2])),
    session(dates[2], sets(60, 9, [2, 2, 2]))
  ]);
  assert.equal(result.path, 'E1RM_TREND_CONFIRMED');
  assert.ok(result.e1rmTrendPct >= 3);
});

test('warmups, other exercises and invalid rows never decide progression', () => {
  const result = evaluate([session(dates[0], [
    row(100, 4, 2, 'R'),
    { exerciseId: 'other', weight: 200, reps: 12, rir: 5 },
    row(0, 0, 5), ...sets(60, 12, [4, 4, 4])
  ])]);
  assert.equal(result.weight, 60);
  assert.equal(result.lastTopWeight, 60);
  assert.equal(result.path, 'FAST_TRACK_1_SESSION');
});

test('flag from previous five exercise workouts blocks increase', () => {
  const result = evaluate([
    session(dates[0], sets(60, 12, [4, 4, 4])),
    session(dates[1], sets(60, 12, [4, 4, 4]), 'pain')
  ]);
  assert.equal(result.action, 'review');
});

test('missing RIR or changed working weight does not fabricate progression', () => {
  const incomplete = evaluate([session(dates[0], sets(60, 12, [3, null, 3]))]);
  assert.equal(incomplete.action, 'maintain');
  const changed = evaluate([
    session(dates[0], sets(60, 12, [2, 2, 2])),
    session(dates[1], sets(55, 12, [2, 2, 2])),
    session(dates[2], sets(55, 12, [2, 2, 2]))
  ]);
  assert.equal(changed.action, 'maintain');
});

test('bodyweight exercise never proposes extra kilograms', () => {
  assert.equal(evaluate([session(dates[0], sets(0, 12, [5, 5, 5]))]).action, 'maintain');
});

test('equipment-specific increments use available step sizes', () => {
  assert.deepEqual(advisor.calculateNextWeight(60, 'barbell'), {
    suggestedWeight: 62.5, increment: 2.5, equipmentType: 'barbell'
  });
  assert.deepEqual(advisor.calculateNextWeight(10, 'dumbbell'), {
    suggestedWeight: 11, increment: 1, equipmentType: 'dumbbell_light'
  });
  assert.deepEqual(advisor.calculateNextWeight(60, 'machine_stack'), {
    suggestedWeight: 62.5, increment: 2.5, equipmentType: 'machine_stack'
  });
  assert.deepEqual(advisor.calculateNextWeight(60, 'cable_micro'), {
    suggestedWeight: 62.5, increment: 2.5, equipmentType: 'cable_micro'
  });
  assert.deepEqual(advisor.calculateNextWeight(120, 'machine_stack'), {
    suggestedWeight: 125, increment: 5, equipmentType: 'machine_stack'
  });
  assert.equal(advisor.calculateNextWeight(40, 'Sztanga').equipmentType, 'barbell');
  assert.equal(advisor.calculateNextWeight(40, 'Wyciąg').equipmentType, 'machine_stack');
});

test('source history remains immutable and the preview engine matches', () => {
  const sessions = [session(dates[0], sets(60, 12, [4, 4, 3]))];
  const before = JSON.stringify(sessions);
  evaluate(sessions);
  assert.equal(JSON.stringify(sessions), before);
  const prod = fs.readFileSync(path.join(__dirname, '..', 'assistant/assistant-progression.js'), 'utf8');
  const preview = fs.readFileSync(path.join(__dirname, '..', 'preview/assistant/assistant-progression.js'), 'utf8');
  assert.equal(preview, prod);
});

test('three sessions 12/11/10 -> 12/12/11 -> 12/12/12 progress with less than 3% e1RM', () => {
  const result = evaluate([
    session(dates[0], [row(60,12,2),row(60,12,2),row(60,12,2)]),
    session(dates[1], [row(60,12,2),row(60,12,2),row(60,11,2)]),
    session(dates[2], [row(60,12,2),row(60,11,2),row(60,10,2)])
  ]);
  assert.equal(result.path,'REPS_TREND_CONFIRMED');
  assert.ok(result.e1rmTrendPct < 3);
  assert.ok(result.e1rmTrendPct >= 0);
});

test('declining RIR or inconsistent set counts prevent a reps-trend shortcut', () => {
  const fatigue = evaluate([
    session(dates[0], sets(60,12,[2,2,2])),
    session(dates[1], sets(60,11,[4,4,4])),
    session(dates[2], sets(60,10,[4,4,4]))
  ]);
  assert.equal(fatigue.action,'maintain');
  const unequal = evaluate([
    session(dates[0], sets(60,12,[2,2,2])),
    session(dates[1], sets(60,11,[2,2])),
    session(dates[2], sets(60,10,[2,2,2]))
  ]);
  assert.equal(unequal.action,'maintain');
});

test('large physical stack step blocks applying excessive weight', () => {
  const result = advisor.calculateNextWeight(45,'machine_stack',6);
  assert.equal(result.blockedByStep,true);
  assert.equal(result.suggestedWeight,null);
  assert.equal(result.increment,6);
  const stable = advisor.calculateNextWeight(75,'machine_stack',6);
  assert.equal(stable.suggestedWeight,81);
  assert.equal(stable.increment,6);
});

test('exercise with unknown equipment does not assume barbell load', () => {
  const result = advisor.suggest([
    session(dates[0], sets(60,12,[4,4,4]))
  ],exerciseId,{minReps:8,maxReps:12,equipmentType:'unknown'});
  assert.equal(result.action,'consider_increase');
  assert.equal(result.needsEquipment,true);
  assert.equal(result.suggestedWeight,null);
});

test('settings are exercise-scoped, with backup-friendly fields and no workout mutation', () => {
  const settingsFile = fs.readFileSync(path.join(__dirname,'../assistant/equipment-settings-ui.js'),'utf8');
  const stageSettingsFile = fs.readFileSync(path.join(__dirname,'../preview/assistant/equipment-settings-ui.js'),'utf8');
  assert.equal(settingsFile,stageSettingsFile);
  assert.match(settingsFile,/equipmentType/);
  assert.match(settingsFile,/equipmentStepKg/);
  assert.match(settingsFile,/state\.exercises = original\.map/);
  assert.doesNotMatch(settingsFile,/state\.sessions\s*=/);
  assert.doesNotMatch(settingsFile,/state\.plans\s*=/);
  assert.match(settingsFile,/if \(save\(\) !== true\)/);
  const staging = fs.readFileSync(path.join(__dirname,'../preview/index.html'),'utf8');
  const sw = fs.readFileSync(path.join(__dirname,'../preview/sw.js'),'utf8');
  assert.match(staging,/v2\.0\.0 TEST/);
  assert.match(staging,/equipment-settings-ui\.js\?v=200/);
  assert.match(sw,/equipment-settings-ui\.js\?v=200/);
  assert.match(staging,/profile-core\.js\?v=190/);
  assert.match(staging,/moja-silownia-preview-v01/);
  const prod = fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.match(prod,/v2\.0\.0/);
  assert.doesNotMatch(prod,/equipment-settings-ui\.js/);
});

test('invalid step inputs are rejected by the equipment UI', () => {
  const settingsFile = fs.readFileSync(path.join(__dirname,'../assistant/equipment-settings-ui.js'),'utf8');
  assert.match(settingsFile,/validStep/);
  assert.match(settingsFile,/step !== null && !validStep\(step\)/);
});
