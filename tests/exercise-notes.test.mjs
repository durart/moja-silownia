import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../modules/exercise-notes.js', import.meta.url), 'utf8');
const { normalizeExerciseNote, getExerciseNote, setExerciseNote, progressionNoteConstraint, MAX_NOTE_LENGTH } =
  await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(source));

test('one note per exercise, independent of set count', () => {
  const notes = setExerciseNote({}, 'bench', { text: 'Bark przy trzeciej serii', flag: 'pain' });
  assert.deepEqual(getExerciseNote(notes, 'bench'), { text: 'Bark przy trzeciej serii', flag: 'pain' });
  assert.deepEqual(getExerciseNote(notes, 'row'), { text: '', flag: 'none' });
});

test('note updates are immutable and clearing a note removes it', () => {
  const original = { bench: { text: 'Stara notatka', flag: 'none' } };
  const updated = setExerciseNote(original, 'bench', { text: 'Nowa', flag: 'equipment' });
  assert.equal(original.bench.text, 'Stara notatka');
  assert.equal(updated.bench.text, 'Nowa');
  assert.deepEqual(setExerciseNote(updated, 'bench', { text: '', flag: 'none' }), {});
});

test('malformed and excessive text is safely normalized', () => {
  assert.deepEqual(normalizeExerciseNote({ text: 12, flag: 'unknown' }), { text: '', flag: 'none' });
  assert.equal(normalizeExerciseNote({ text: 'x'.repeat(3000) }).text.length, MAX_NOTE_LENGTH);
  assert.throws(() => setExerciseNote({}, '', {}), TypeError);
});

test('pain, equipment and technique prevent automated increases', () => {
  for (const flag of ['pain', 'equipment', 'technique']) {
    assert.equal(progressionNoteConstraint({ flag }).allowIncrease, false);
  }
  assert.equal(progressionNoteConstraint({ text: 'Mało czasu' }).allowIncrease, true);
});
