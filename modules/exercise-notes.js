// One optional note per exercise within a workout; no per-set notes.
export const NOTE_FLAGS = Object.freeze(['none', 'pain', 'equipment', 'technique']);
export const MAX_NOTE_LENGTH = 2000;

export function normalizeExerciseNote(input) {
  const source = input && typeof input === 'object' ? input : {};
  const text = typeof source.text === 'string' ? source.text.slice(0, MAX_NOTE_LENGTH) : '';
  const flag = NOTE_FLAGS.includes(source.flag) ? source.flag : 'none';
  return { text, flag };
}

export function getExerciseNote(notes, exerciseId) {
  if (!notes || typeof notes !== 'object' || !exerciseId) return normalizeExerciseNote();
  return normalizeExerciseNote(Object.prototype.hasOwnProperty.call(notes, exerciseId) ? notes[exerciseId] : null);
}

export function setExerciseNote(notes, exerciseId, input) {
  if (typeof exerciseId !== 'string' || !exerciseId.trim()) {
    throw new TypeError('exerciseId must be a non-empty string');
  }
  const next = notes && typeof notes === 'object' && !Array.isArray(notes) ? { ...notes } : {};
  const note = normalizeExerciseNote(input);
  if (!note.text.trim() && note.flag === 'none') delete next[exerciseId];
  else next[exerciseId] = note;
  return next;
}

export function progressionNoteConstraint(note) {
  const { flag } = normalizeExerciseNote(note);
  if (flag === 'pain') return { allowIncrease: false, reason: 'Zgłoszono ból lub dyskomfort.' };
  if (flag === 'equipment') return { allowIncrease: false, reason: 'Zmiana sprzętu ogranicza porównywalność obciążenia.' };
  if (flag === 'technique') return { allowIncrease: false, reason: 'Zgłoszono problem z techniką.' };
  return { allowIncrease: true, reason: '' };
}
