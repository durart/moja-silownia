import test from 'node:test';
import assert from 'node:assert/strict';
import ui from '../modules/timed-workout-ui.js';

const context = { workoutId: 'session-1', exerciseId: 'seed-14', rowKey: 'r_0_0' };
const other = { ...context, rowKey: 'r_0_1' };
const timedSet = { measurementType: 'duration', durationSeconds: 45, weight: 0 };

test('one stopwatch runs per session and retains its original start time', () => {
  const first = ui.startTimer(null, context, 1000);
  assert.equal(first.status, 'started');
  assert.deepEqual(ui.startTimer(first.timer, context, 2000),
    { status: 'already_running', timer: first.timer });
  assert.deepEqual(ui.startTimer(first.timer, other, 2000),
    { status: 'busy', timer: first.timer });
  assert.deepEqual(ui.stopTimer(first.timer, other, 51000),
    { status: 'invalid', timer: first.timer });
  assert.deepEqual(ui.stopTimer(first.timer, context, 51999),
    { status: 'stopped', timer: null, durationSeconds: 50 });
});

test('serialized stopwatch restores only within the original workout', () => {
  const started = ui.startTimer(null, context, 1000).timer;
  const restored = JSON.parse(JSON.stringify(started));
  assert.deepEqual(ui.activeTimer(restored, context.workoutId), started);
  assert.equal(ui.activeTimer(restored, 'session-2'), null);
  assert.equal(ui.activeTimer({ ...restored, startedAt: -1 }, context.workoutId), null);
  assert.equal(ui.stopTimer(restored, context, 1500).status, 'too_short');
  assert.equal(ui.stopTimer(restored, context, 500).status, 'invalid');
});

test('timed value preserves explicit seconds and never converts legacy reps', () => {
  assert.equal(ui.durationValue({ previous: timedSet }), 45);
  assert.equal(ui.durationValue({ previous: { reps: 45 } }), '');
  assert.equal(ui.durationValue({ targetSeconds: 50, previous: timedSet }), 50);
  assert.equal(ui.durationValue({ draftSeconds: 48, targetSeconds: 50 }), 48);
  assert.equal(ui.durationValue({ entry: timedSet, draftSeconds: 60 }), 45);
  assert.equal(ui.durationValue({ entry: { reps: 45 } }), '');
  assert.equal(ui.previousLabel({ reps: 45 }), 'Starszy zapis');
  assert.equal(ui.previousLabel(timedSet), '45 s');
});

test('timed field shows seconds, not RIR or repetitions, and reflects stopwatch ownership', () => {
  const timer = ui.startTimer(null, context, 1000).timer;
  const active = ui.renderDurationField({ ...context, timer, now: 51000, targetSeconds: 50 });
  assert.match(active, /CZAS \(S\)/);
  assert.match(active, /value="50"/);
  assert.match(active, /00:50/);
  assert.match(active, /data-timed-action="stop"/);
  assert.doesNotMatch(active, /RIR|POWT\./);
  const inactive = ui.renderDurationField({ ...other, timer, now: 51000 });
  assert.match(inactive, /data-timed-action="start" disabled/);
  const complete = ui.renderDurationField({ ...context, entry: timedSet });
  assert.match(complete, /value="45" readonly/);
  assert.doesNotMatch(complete, /data-timed-action/);
  const legacy = ui.renderDurationField({ ...context, entry: { reps: 45 } });
  assert.match(legacy, /Starszy zapis/);
  assert.doesNotMatch(legacy, /value="45"/);
});

test('markup escapes untrusted exercise and row identifiers', () => {
  const html = ui.renderDurationField({ ...context, exerciseId: 'x" onclick="bad()', rowKey: '<script>' });
  assert.match(html, /x&quot; onclick=&quot;bad\(\)/);
  assert.doesNotMatch(html, /<script>| onclick="bad\(\)/);
  assert.equal(ui.formatElapsed(3661), '61:01');
  assert.equal(ui.formatElapsed(-2), '00:00');
});
