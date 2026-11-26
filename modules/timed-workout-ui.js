// Shared timed-set presentation and stopwatch state transitions.
(function(root, factory) {
  const core = typeof module === 'object' && module.exports
    ? require('./timed-exercise-core.js') : root.MojaTimedExercise;
  const api = factory(core);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MojaTimedWorkoutUI = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(core) {
  'use strict';

  const validIdentity = value => typeof value === 'string' && value.length > 0 && value.length <= 250;
  const validNow = value => Number.isSafeInteger(value) && value >= 0;
  const validSeconds = value => Number.isInteger(value) && value >= 1 && value <= 86400;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[c]);

  function sameRow(timer, context) {
    return !!timer && !!context && timer.workoutId === context.workoutId &&
      timer.exerciseId === context.exerciseId && timer.rowKey === context.rowKey;
  }

  function activeTimer(timer, workoutId) {
    return validIdentity(workoutId) && timer?.workoutId === workoutId &&
      validIdentity(timer.exerciseId) && validIdentity(timer.rowKey) && validNow(timer.startedAt)
      ? timer : null;
  }

  function startTimer(timer, context, now) {
    if (![context?.workoutId, context?.exerciseId, context?.rowKey].every(validIdentity) || !validNow(now))
      return { status: 'invalid', timer: null };
    const running = activeTimer(timer, context.workoutId);
    if (running) return { status: sameRow(running, context) ? 'already_running' : 'busy', timer: running };
    return { status: 'started', timer: { workoutId: context.workoutId, exerciseId: context.exerciseId,
      rowKey: context.rowKey, startedAt: now } };
  }

  function stopTimer(timer, context, now) {
    const running = activeTimer(timer, context?.workoutId);
    if (!sameRow(running, context) || !validNow(now) || now < running.startedAt)
      return { status: 'invalid', timer: running };
    const durationSeconds = core.elapsedSeconds(running.startedAt, now);
    if (durationSeconds < 1) return { status: 'too_short', timer: running };
    return { status: 'stopped', timer: null, durationSeconds };
  }

  function formatElapsed(seconds) {
    const value = Number.isFinite(seconds) ? Math.max(0, Math.min(86400, Math.floor(seconds))) : 0;
    return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0');
  }

  function previousLabel(set) {
    if (core.isTimedSet(set)) return set.durationSeconds + ' s';
    return set ? 'Starszy zapis' : '—';
  }

  function durationValue({ entry, draftSeconds, previous, targetSeconds }) {
    if (core.isTimedSet(entry)) return entry.durationSeconds;
    if (entry) return '';
    for (const value of [draftSeconds, targetSeconds, core.isTimedSet(previous) ? previous.durationSeconds : null])
      if (validSeconds(value)) return value;
    return '';
  }

  function renderDurationField({ rowKey, exerciseId, workoutId, entry, draftSeconds,
    previous, targetSeconds, timer, now = 0 }) {
    if (![rowKey, exerciseId, workoutId].every(validIdentity)) return '';
    const running = activeTimer(timer, workoutId);
    const ownTimer = sameRow(running, { rowKey, exerciseId, workoutId });
    const value = durationValue({ entry, draftSeconds, previous, targetSeconds });
    const completed = !!entry;
    const legacy = completed && !core.isTimedSet(entry);
    return '<label class="sport-set-field sport-reps timed-duration-field">' +
      '<span class="sport-field-caption">CZAS (S)</span>' +
      '<input id="' + escape(rowKey) + '_duration" type="number" min="1" max="86400" step="1" inputmode="numeric" aria-label="Czas serii w sekundach" value="' +
      escape(value) + '"' + (completed ? ' readonly' : '') + '>' +
      (legacy ? '<small>Starszy zapis – nie przeliczono na sekundy</small>' : '') +
      '</label>' +
      (completed ? '' : '<div class="timed-stopwatch" data-timed-row="' + escape(rowKey) +
        '" data-timed-exercise="' + escape(exerciseId) + '">' +
        '<output aria-label="Czas stopera" data-timed-clock>' +
        formatElapsed(ownTimer ? core.elapsedSeconds(running.startedAt, now) : 0) + '</output>' +
        '<button type="button" class="secondary" data-timed-action="' + (ownTimer ? 'stop' : 'start') + '"' +
        (running && !ownTimer ? ' disabled' : '') + '>' +
        (ownTimer ? 'Zatrzymaj' : 'Uruchom stoper') + '</button></div>');
  }

  return Object.freeze({ sameRow, activeTimer, startTimer, stopTimer, formatElapsed,
    previousLabel, durationValue, renderDurationField });
});
