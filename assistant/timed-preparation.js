/* Prepare time-based strength prescriptions without changing the user's history. */
(function(root, factory) {
  const core = typeof module === 'object' && module.exports
    ? require('../modules/timed-exercise-core.js') : root.MojaTimedExercise;
  const api = factory(core);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MojaTimedPreparation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(core) {
  'use strict';
  const DEFAULT_RANGE = Object.freeze({ minSeconds:30, maxSeconds:60 });
  const flags = new Set(['pain','equipment','technique']);
  const validSeconds = x => Number.isInteger(x) && x > 0 && x <= 86400;
  const validWeight = x => (typeof x === 'number' || typeof x === 'string' && x.trim() !== '') &&
    Number.isFinite(Number(x)) && Number(x) >= 0 ? Number(x) : null;
  const countOf = x => Number.isInteger(Number(x)) && Number(x) > 0 ? Math.min(30,Number(x)) : null;
  const warmup = x => x?.setType === 'R' || x?.type === 'R' || x?.type === 'warmup';
  const scoped = (row,planId,slot) => Number.isInteger(slot) && planId != null
    ? row.planId === planId && row.planSlotIndex === slot
    : row.planId == null && !Number.isInteger(row.planSlotIndex);
  const rangeOf = item => core.parseDurationTarget(item?.reps) ??
    (validSeconds(item?.durationSeconds) ? {minSeconds:item.durationSeconds,maxSeconds:item.durationSeconds} : null);
  const clamp = (x,range) => Math.min(range.maxSeconds,Math.max(range.minSeconds,x));

  function prepare({sessions,exercise,target,sessionMode,activeFlag,planId,slotIndex,cautionToday=false}) {
    const history = (Array.isArray(sessions)?sessions:[])
      .filter(s => Number.isFinite(Date.parse(s?.date)))
      .map(s => ({...s,sets:(Array.isArray(s.sets)?s.sets:[]).filter(r =>
        r?.exerciseId === exercise.id && scoped(r,planId,slotIndex))}))
      .filter(s => s.sets.length || s.exerciseNotes?.[exercise.id])
      .sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
    const attempts = history.filter(s=>s.sets.some(r=>!warmup(r)));
    const latest = attempts.find(s=>s.sessionMode !== 'recovery');
    const working = core.workingTimedSets(latest,exercise.id);
    const explicit = rangeOf(target);
    const details = Array.isArray(target?.setDetails) ? target.setDetails : [];
    const recordedCount = Math.max(0,...working.map(r=>countOf(r.targetSetCount)||0));
    const count = countOf(target?.sets) || countOf(details.length) ||
      countOf(recordedCount) || countOf(working.length) || (Number.isInteger(slotIndex)?3:1);
    const range = explicit || DEFAULT_RANGE;
    const isRecovery = sessionMode === 'recovery';
    const recentFlag = flags.has(activeFlag) || history.slice(0,5).some(s=>flags.has(s.exerciseNotes?.[exercise.id]?.flag));
    const priorGoal = validSeconds(working[0]?.targetDurationSeconds)
      ? clamp(working[0].targetDurationSeconds,range) : range.minSeconds;
    const planned = Array.from({length:count},(_,i)=>{
      const detail=details[i], previous=working.find(r=>r.planSetIndex===i||r.manualSetIndex===i) ?? working[i];
      const setType=warmup(detail)?'R':'W';
      const kg=validWeight(detail?.weight) ?? validWeight(target?.weight) ?? validWeight(previous?.weight) ?? 0;
      return {detail,previous,setType,kg,range:rangeOf(detail)||range};
    });
    const expectedSets = planned.filter(r=>r.setType==='W').length;
    const comparable = expectedSets>0 && working.length>0 &&
      latest.sets.filter(r=>!warmup(r)).every(core.isTimedSet) &&
      (Number.isInteger(slotIndex)||recordedCount>0) &&
      planned.filter(r=>r.setType==='W').every(r=>r.range.minSeconds===range.minSeconds &&
        r.range.maxSeconds===range.maxSeconds && r.kg===validWeight(working[0].weight));
    let advice={action:working.length?'maintain':'initial',targetSeconds:priorGoal};
    if(comparable && !isRecovery && !recentFlag && !cautionToday)
      advice=core.suggestDuration([latest],exercise.id,{
        target:range,previousTargetSeconds:priorGoal,expectedSets:Math.max(expectedSets,recordedCount)
      });
    if(isRecovery) advice={action:'recovery',targetSeconds:Math.min(priorGoal,range.minSeconds)};
    else if(recentFlag) advice={action:'review',targetSeconds:priorGoal};
    else if(cautionToday) advice={action:'readiness',targetSeconds:priorGoal};
    const rows=planned.map(({detail,previous,setType,kg,range:rowRange})=>{
      let seconds=clamp(advice.targetSeconds,rowRange);
      if(setType==='R') seconds=rowRange.minSeconds;
      if(isRecovery){
        const achieved=validSeconds(previous?.durationSeconds)?previous.durationSeconds:seconds;
        seconds=Math.min(seconds,achieved,rowRange.minSeconds);
      }
      return {measurementType:'duration',weight:isRecovery||recentFlag?0:kg,
        durationSeconds:seconds,targetDurationSeconds:seconds,setType};
    });
    return {rows,action:advice.action,reason:'timed_'+advice.action};
  }
  return Object.freeze({prepare});
});
