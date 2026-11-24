import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const context = {};
runInNewContext(read('preview/profile-core.js'), context);
const core = context.ProfileCore;
const plain = value => JSON.parse(JSON.stringify(value));
const existing = {
  exercises: [{ id: 'bench', name: 'Bench' }], plans: [{ id: 2, name: 'A' }],
  active: [{ exerciseId: 'bench', weight: 60, reps: 10 }],
  sessions: [{ id: 1, date: '2026-10-01T09:00:00Z',
    sets: [{ exerciseId: 'bench', weight: 80, reps: 5, rir: 2 }] }],
  bodyWeight: 100.6, restSettings: { bench: 150 }
};

test('old profile-free data remains valid and is not interpreted as measured weight', () => {
  assert.equal(core.isValidProfile(undefined), true);
  assert.deepEqual(plain(core.normalizeProfile(undefined)), { heightCm: null, weightHistory: [] });
  assert.equal(core.currentWeight(null), null);
  assert.equal(core.resolveWorkoutWeight({}, null, 100.6), 100.6);
  const imported = plain(existing);
  imported.profile = plain(core.normalizeProfile(imported.profile));
  assert.deepEqual(imported.sessions, existing.sessions);
  assert.deepEqual(imported.active, existing.active);
  assert.deepEqual(imported.plans, existing.plans);
  assert.deepEqual(imported.restSettings, existing.restSettings);
});

test('save, update same date and order by date without mutating source', () => {
  const empty = core.normalizeProfile(undefined);
  const first = core.upsertWeight(empty, { id: 'a', date: '2026-11-20', weightKg: 100.2 });
  const second = core.upsertWeight(first, { id: 'b', date: '2026-11-23', weightKg: 99.4 });
  const updated = core.upsertWeight(second, { id: 'c', date: '2026-11-23', weightKg: 99.1 });
  assert.equal(core.currentWeight(updated), 99.1);
  assert.equal(updated.weightHistory.length, 2);
  assert.equal(updated.weightHistory[0].id, 'b');
  assert.equal(first.weightHistory.length, 1);
  assert.deepEqual(plain(updated.weightHistory.map(x => x.date)), ['2026-11-23', '2026-11-20']);
  assert.equal(core.currentWeight(core.removeWeight(updated, 'b')), 100.2);
});

test('JSON backup roundtrip preserves height, dated weights, old workouts and settings', () => {
  const value = structuredClone(existing);
  value.profile = core.upsertWeight({ heightCm: 179, weightHistory: [] }, {
    id: 'w1', date: '2026-11-23', weightKg: 99.3
  });
  const decoded = JSON.parse(JSON.stringify(value));
  assert.equal(core.isValidProfile(decoded.profile), true);
  assert.equal(decoded.profile.heightCm, 179);
  assert.equal(core.currentWeight(decoded.profile), 99.3);
  assert.deepEqual(decoded.sessions, existing.sessions);
  assert.deepEqual(decoded.restSettings, existing.restSettings);
});

test('bad values, duplicate rows and impossible dates are rejected', () => {
  for (const n of [0, -1, 19.9, 351, NaN, Infinity, '99']) assert.equal(core.validWeight(n), false);
  for (const n of [0, 79.9, 251, '179']) assert.equal(core.validHeight(n), false);
  assert.equal(core.validDate('2026-02-30'), false);
  assert.equal(core.validDate('2026-11-23'), true);
  assert.equal(core.isValidProfile({ heightCm: 179, weightHistory: [
    { id: 'a', date: '2026-11-23', weightKg: 100 },
    { id: 'b', date: '2026-11-23', weightKg: 101 }
  ] }), false);
  assert.throws(() => core.normalizeProfile({ heightCm: -2, weightHistory: [] }), /profilu/);
});

test('workout weight prefers training snapshot over future changes to profile', () => {
  const profile = core.upsertWeight(null, { id: 'a', date: '2026-11-23', weightKg: 95 });
  assert.equal(core.resolveWorkoutWeight({ preWorkout: { weight: 101 } }, profile, 100.6), 101);
  assert.equal(core.resolveWorkoutWeight({ bodyWeightKg: 102 }, profile, 100.6), 102);
  assert.equal(core.resolveWorkoutWeight({}, profile, 100.6), 95);
});

test('relative strength ignores warmups and reports best exercise-specific working e1RM', () => {
  const sessions = [{ sets: [
    { exerciseId: 'row', weight: 40, reps: 10, rir: 2 },
    { exerciseId: 'bench', weight: 120, reps: 1, setType: 'R' },
    { exerciseId: 'bench', weight: 80, reps: 5, rir: 2 },
    { exerciseId: 'bench', weight: 20, reps: 15 },
  ] }];
  const output = core.relativeStrength(sessions, 'bench', 100);
  assert.equal(output.bestLoadKg, 80);
  assert.equal(output.relativeLoad, 0.8);
  assert.ok(Math.abs(output.estimatedOneRmKg - 98.6666667) < 0.001);
  assert.equal(core.relativeStrength(sessions, 'squat', 100), null);
});

test('staging remains isolated and production v2 retains profile v1.9', () => {
  const preview = read('preview/index.html');
  const sw = read('preview/sw.js');
  const production = read('index.html');
  assert.match(preview, /moja-silownia-preview-v01/);
  assert.match(preview, /window\.MojaSilowniaModules\?\.stateStorage\?\.key===key/);
  assert.match(read('preview/modules/bootstrap.js'), /key:'moja-silownia-preview-v01'/);
  assert.match(preview, /id="profileContent"/);
  assert.match(preview, /profile-core\.js\?v=190/);
  assert.match(preview, /profile-ui\.js\?v=310/);
  assert.match(sw, /profile-core\.js\?v=190/);
  assert.match(sw, /profile-ui\.js\?v=310/);
  assert.match(production, /v3\.2\.0/);
  assert.match(production, /const key='moja-silownia-v01'/);
  assert.match(production, /id="profileContent"/);
  assert.match(production, /profile-core\.js\?v=190/);
  assert.match(production, /profile-ui\.js\?v=310/);
  assert.match(production, /profile\.css\?v=190/);
  assert.match(production, /v\.profile=ProfileCore\.normalizeProfile\(v\.profile\)/);
  assert.match(production, /bodyWeightKg:ProfileCore\.resolveWorkoutWeight/);
  assert.match(production, /estimateCalories/);
  assert.match(read('sw.js'), /moja-silownia-shell-v45-progress-3\.1\.2/);
  assert.match(read('sw.js'), /profile-core\.js\?v=190/);
  assert.match(read('sw.js'), /profile-ui\.js\?v=310/);
  assert.match(read('sw.js'), /profile\.css\?v=190/);
  assert.equal(read('profile-core.js'), read('preview/profile-core.js'));
  assert.equal(read('profile-ui.js'), read('preview/profile-ui.js'));
  assert.equal(read('profile.css'), read('preview/profile.css'));
});
