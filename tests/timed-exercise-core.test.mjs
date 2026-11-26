import test from 'node:test';
import assert from 'node:assert/strict';
import timed from '../modules/timed-exercise-core.js';

const id = 'seed-14';
const target = { minSeconds: 45, maxSeconds: 60 };
const options = { target, expectedSets: 3, previousTargetSeconds: 45 };
const row = (seconds, prescribed = 45, extra = {}) => timed.createTimedSet({
  exerciseId: id, weight: 0, setType: 'W', targetDurationSeconds: prescribed, ...extra
}, seconds);
const session = (sets, extra = {}) => ({ date: '2026-11-24T08:00:00Z', sets, ...extra });

test('stable catalog identifiers distinguish timed exercises from repetition exercises', () => {
  for (const id of ['seed-14', 'seed-93', 'seed-99', 'cali-17', 'cali-20'])
    assert.equal(timed.measurementType({ id, name: 'Renamed' }), 'duration');
  assert.equal(timed.measurementType({ id: 'seed-13', name: 'Plank' }), 'reps');
  assert.equal(timed.measurementType({ id: 'custom-1', measurementType: 'duration' }), 'duration');
});

test('parse duration targets without interpreting repetitions as time', () => {
  assert.deepEqual(timed.parseDurationTarget('45–60 s'), target);
  assert.deepEqual(timed.parseDurationTarget('45-60 sekund'), target);
  assert.deepEqual(timed.parseDurationTarget('45 s'), { minSeconds: 45, maxSeconds: 45 });
  for (const input of ['8–12', '60–45 s', '0 s', '1.5 s', '86401 s', '', null])
    assert.equal(timed.parseDurationTarget(input), null);
});

test('new timed sets exclude reps and RIR; legacy records remain unmodified', () => {
  const previous = { exerciseId: id, weight: 0, reps: 45, rir: 2 };
  const next = timed.createTimedSet(previous, 50);
  assert.deepEqual(previous, { exerciseId: id, weight: 0, reps: 45, rir: 2 });
  assert.deepEqual(next, { exerciseId: id, weight: 0, measurementType: 'duration', durationSeconds: 50 });
  assert.equal(timed.isTimedSet(previous), false);
  assert.equal(timed.isTimedSet(next), true);
  for (const seconds of [0, -1, 2.5, '50', NaN, Infinity])
    assert.throws(() => timed.createTimedSet(previous, seconds), RangeError);
});

test('progress by five seconds only after all comparable prescribed working sets succeed', () => {
  assert.deepEqual(timed.suggestDuration([session([row(45), row(45), row(45)])], id, options),
    { action: 'increase', targetSeconds: 50 });
  for (const rows of [[row(45), row(45)], [row(45), row(40), row(30)],
    [row(45), row(45), row(45, 45, { setType: 'R' })],
    [row(45), row(45), row(45, 45, { weight: 5 })],
    [row(45, 40), row(45, 40), row(45, 40)]])
    assert.deepEqual(timed.suggestDuration([session(rows)], id, options),
      { action: 'maintain', targetSeconds: 45 });
});

test('recovery and ambiguous historical repetitions cannot increase the target', () => {
  const old = { exerciseId: id, weight: 0, reps: 60 };
  assert.deepEqual(timed.suggestDuration([session([old, old, old]),
    session([row(45), row(45), row(45)], { sessionMode: 'recovery' })], id, options),
    { action: 'initial', targetSeconds: 45 });
  assert.deepEqual(timed.suggestDuration([session([row(45), row(45), row(45)], {
    exerciseNotes: { [id]: { flag: 'technique' } } })], id, options),
    { action: 'review', targetSeconds: 45 });
});

test('progression stays inside the plan target and validates arguments', () => {
  assert.deepEqual(timed.suggestDuration([session([row(60, 60), row(60, 60), row(60, 60)])], id,
    { ...options, previousTargetSeconds: 60 }), { action: 'at_limit', targetSeconds: 60 });
  assert.deepEqual(timed.suggestDuration([session([row(58, 58), row(58, 58), row(58, 58)])], id,
    { ...options, previousTargetSeconds: 58 }), { action: 'increase', targetSeconds: 60 });
  assert.throws(() => timed.suggestDuration([], id, { ...options, expectedSets: 0 }), RangeError);
});

test('elapsed time derives from timestamps rather than timer callback frequency', () => {
  assert.equal(timed.elapsedSeconds(1000, 51999), 50);
  assert.equal(timed.elapsedSeconds(1000, 500), 0);
  assert.equal(timed.elapsedSeconds(null, 5000), 0);
  assert.equal(timed.elapsedSeconds(0, 999999999), 86400);
});
