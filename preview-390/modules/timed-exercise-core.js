// Time-based strength exercise rules, independent of the DOM and persistence.
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MojaTimedExercise = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const timedIds = new Set(['seed-14', 'seed-93', 'seed-99', 'cali-17', 'cali-20']);
  const DEFAULT_TARGET = Object.freeze({ minSeconds: 30, maxSeconds: 60 });
  const STEP_SECONDS = 5;
  const validSeconds = value => typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 86400;

  function measurementType(exercise) {
    return exercise?.measurementType === 'duration' || timedIds.has(exercise?.id) ? 'duration' : 'reps';
  }

  function parseDurationTarget(value) {
    if (typeof value !== 'string') return null;
    const match = value.trim().match(/^(\d+)\s*(?:[-–—]\s*(\d+)\s*)?(?:s|sek\.?|sekund(?:y|a)?)$/i);
    if (!match) return null;
    const minSeconds = Number(match[1]), maxSeconds = Number(match[2] ?? match[1]);
    return validSeconds(minSeconds) && validSeconds(maxSeconds) && maxSeconds >= minSeconds
      ? { minSeconds, maxSeconds } : null;
  }

  function isTimedSet(set) {
    return set?.measurementType === 'duration' && validSeconds(set.durationSeconds);
  }

  function validateTimedRecords(state) {
    // Validate only explicitly typed new records. Legacy repetition entries remain untouched.
    const sets=[...(Array.isArray(state?.active)?state.active:[]),...(Array.isArray(state?.sessions)?state.sessions:[])
      .flatMap(session=>Array.isArray(session?.sets)?session.sets:[])];
    for(const set of sets){
      if(set?.measurementType!=='duration')continue;
      if(!isTimedSet(set)||typeof set.exerciseId!=='string'||!set.exerciseId||
        typeof set.weight!=='number'||!Number.isFinite(set.weight)||set.weight<0||
        (set.targetDurationSeconds!=null&&!validSeconds(set.targetDurationSeconds))||
        (set.targetSetCount!=null&&(!Number.isSafeInteger(set.targetSetCount)||set.targetSetCount<1||set.targetSetCount>100)))
        throw new Error('Nieprawidłowy zapis serii czasowej w kopii zapasowej.');
    }
    return state;
  }

  function createTimedSet(fields, seconds) {
    if (!validSeconds(seconds)) throw new RangeError('Invalid duration in seconds');
    const { reps, rir, ...base } = fields || {};
    return { ...base, measurementType: 'duration', durationSeconds: seconds };
  }

  function workingTimedSets(session, exerciseId) {
    return (Array.isArray(session?.sets) ? session.sets : []).filter(set =>
      set?.exerciseId === exerciseId && isTimedSet(set) &&
      set.setType !== 'R' && set.type !== 'R' && set.type !== 'warmup');
  }

  function suggestDuration(sessions, exerciseId, options = {}) {
    const { minSeconds, maxSeconds } = options.target || DEFAULT_TARGET;
    if (!validSeconds(minSeconds) || !validSeconds(maxSeconds) || maxSeconds < minSeconds)
      throw new RangeError('Invalid duration target');
    const expectedSets = options.expectedSets;
    if (!Number.isInteger(expectedSets) || expectedSets < 1)
      throw new RangeError('Invalid expected set count');
    const targetSeconds = validSeconds(options.previousTargetSeconds)
      ? Math.max(minSeconds, Math.min(maxSeconds, options.previousTargetSeconds)) : minSeconds;
    const history = (Array.isArray(sessions) ? sessions : [])
      .filter(session => session?.sessionMode !== 'recovery' && Number.isFinite(Date.parse(session?.date)))
      .map(session => ({ session, sets: workingTimedSets(session, exerciseId) }))
      .filter(item => item.sets.length)
      .sort((a, b) => Date.parse(b.session.date) - Date.parse(a.session.date));
    const latest = history[0];
    if (!latest) return { action: 'initial', targetSeconds };
    if (history.slice(0, 5).some(({ session }) =>
      ['pain', 'technique', 'equipment'].includes(session.exerciseNotes?.[exerciseId]?.flag)))
      return { action: 'review', targetSeconds };
    const recordedTarget = latest.sets[0].targetDurationSeconds;
    const comparable = validSeconds(recordedTarget) && recordedTarget === targetSeconds &&
      latest.sets.length >= expectedSets && latest.sets.every(set =>
        set.targetDurationSeconds === recordedTarget && set.durationSeconds >= recordedTarget &&
        Number.isFinite(Number(set.weight)) && Number(set.weight) >= 0 &&
        Number(set.weight) === Number(latest.sets[0].weight));
    if (!comparable) return { action: 'maintain', targetSeconds };
    if (targetSeconds >= maxSeconds) return { action: 'at_limit', targetSeconds };
    return { action: 'increase', targetSeconds: Math.min(maxSeconds, targetSeconds + STEP_SECONDS) };
  }

  function detectDurationRecord({exerciseId,weight,durationSeconds,completedSessions=[],activeSets=[],exclude=null,sessionMode='standard',setType='W'}) {
    if(sessionMode==='recovery'||setType==='R'||!validSeconds(durationSeconds)||!Number.isFinite(weight)||weight<0)return [];
    const prior=[...completedSessions.filter(s=>s?.sessionMode!=='recovery').flatMap(s=>workingTimedSets(s,exerciseId)),...workingTimedSets({sets:activeSets},exerciseId)]
      .filter(s=>s!==exclude&&s.weight!=null&&s.weight!==''&&Number(s.weight)===weight);
    return prior.length&&durationSeconds>Math.max(...prior.map(s=>s.durationSeconds))?['Czas']: [];
  }

  function elapsedSeconds(startedAt, now) {
    if (!Number.isFinite(startedAt) || !Number.isFinite(now) || now < startedAt) return 0;
    return Math.min(86400, Math.floor((now - startedAt) / 1000));
  }

  return Object.freeze({ measurementType, parseDurationTarget, isTimedSet, validateTimedRecords, createTimedSet,
    workingTimedSets, suggestDuration, detectDurationRecord, elapsedSeconds });
});
