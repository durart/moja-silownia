import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../modules/workout-selectors.js', import.meta.url), 'utf8');
const selectors = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(source));

test('returns last completed sets and ignores malformed history entries', () => {
  const sessions = [null, { sets: null }, { sets: [{ exerciseId: 'bench', reps: 8 }] }];
  assert.deepEqual(selectors.selectLastSets(sessions, 'bench'), [{ exerciseId: 'bench', reps: 8 }]);
  assert.deepEqual(selectors.selectLastSets(null, 'bench'), []);
});

test('normalizes exercise ids without duplicates or invalid catalog entries', () => {
  assert.deepEqual(selectors.normalizeExtraExerciseIds(['bench', 'bench', 'missing', 4], [null, { id: 'bench' }]), ['bench']);
  assert.deepEqual(selectors.normalizeExtraExerciseIds(['bench'], null), []);
});

test('reports missing exercise safely when catalog is unavailable', () => {
  assert.equal(selectors.selectPlanExtraStatus('bench', { id: 'p' }, null, [], []), 'missing-exercise');
  assert.equal(selectors.selectPlanExtraStatus('bench', null, [], [], []), 'no-plan');
});
