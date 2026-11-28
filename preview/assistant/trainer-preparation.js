/* Prepare editable workout prescriptions without recording any completed sets. */
(function(root, factory) {
  const progression = typeof module === 'object' && module.exports
    ? require('./assistant-progression.js') : root.MojaAdvisorProgression;
  const timed = typeof module === 'object' && module.exports
    ? require('./timed-preparation.js') : root.MojaTimedPreparation;
  const timedCore = typeof module === 'object' && module.exports
    ? require('../modules/timed-exercise-core.js') : root.MojaTimedExercise;
  const adaptive = typeof module === 'object' && module.exports
    ? require('./adaptive-adapter.js') : root.MojaAdaptiveAdapter;
  const recoveryEngine=typeof module==='object'&&module.exports?require('./adaptive-recovery.js'):root.MojaAdaptiveRecovery;
  const explanation=typeof module==='object'&&module.exports?require('./adaptive-explanation.js'):root.MojaAdaptiveExplanation;
  const api = factory(progression,timed,timedCore,adaptive,recoveryEngine,explanation);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MojaTrainerPreparation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(progression,timed,timedCore,adaptive,recoveryEngine,explanation) {
  'use strict';
  const observation=typeof module==='object'&&module.exports?require('../modules/set-observation.js'):globalThis.MojaSetObservation;
  const MAX_SETS = 30;
  const supportedEquipment = new Set(['barbell','dumbbell','dumbbell_light','machine_stack','cable_micro','Sztanga','Hantle','Maszyna','Wyciąg']);
  const flags = new Set(['pain','equipment','technique']);
  const number = value => (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value)) ? Number(value) : null;
  const integer = value => { const n = number(value); return Number.isSafeInteger(n) && n > 0 ? n : null; };
  const weight = value => { const n = number(value); return n !== null && n >= 0 ? n : null; };
  const clamp = (n, low, high) => Math.min(high, Math.max(low, n));
  const warmup = observation.isWarmup;
  function repRange(raw) {
    const text = String(raw ?? '').trim();
    const match = /^(\d+)(?:\s*[-–—]\s*(\d+))?(?:\s*\/\s*(?:strona|noga|ręka))?$/i.exec(text);
    if (!match) return null;
    const min = integer(match[1]), max = integer(match[2] ?? match[1]);
    return min && max && min <= max ? { min, max } : null;
  }
  function targetRange(target, index) {
    const detail = target?.setDetails?.[index];
    if (detail?.reps != null && detail.reps !== '') return repRange(detail.reps);
    const list = String(target?.reps ?? '').split(/\s*[,;]\s*|\s*\/\s*(?=\d)/);
    return repRange(list.length > 1 ? list[index] : target?.reps);
  }
  function validRows(session, id) {
    return (Array.isArray(session?.sets) ? session.sets : []).filter(row =>
      row?.exerciseId === id && observation.isReliable(row) && observation.validRepetitions(row) && ['working','warmup'].includes(observation.setClass(row)));
  }
  function historyFor(sessions, id, context) {
    return (Array.isArray(sessions) ? sessions : [])
      .filter(s => typeof s?.date === 'string' && Number.isFinite(Date.parse(s.date)) && Date.parse(s.date)<=Date.now())
      .map(s => {
        let sets = validRows(s, id);
        if (context.planId != null && Number.isInteger(context.slotIndex)) {
          const samePlan = sets.filter(row => row.planId === context.planId);
          if (samePlan.length) sets = samePlan.filter(row => row.planSlotIndex === context.slotIndex);
          else if (new Set(sets.map(row => JSON.stringify([row.planId ?? null,row.planSlotIndex ?? null]))).size > 1) sets = [];
        }
        if (sets.length && sets.every(row => Number.isInteger(row.planSetIndex)) && new Set(sets.map(row=>row.planSetIndex)).size===sets.length) sets.sort((a,b)=>a.planSetIndex-b.planSetIndex);
        else if (sets.length && sets.every(row => Number.isInteger(row.manualSetIndex)) && new Set(sets.map(row=>row.manualSetIndex)).size===sets.length) sets.sort((a,b)=>a.manualSetIndex-b.manualSetIndex);
        return { ...s, sets };
      })
      .filter(s => s.sets.some(row => !warmup(row)))
      .sort((a,b) => Date.parse(b.date) - Date.parse(a.date));
  }
  function readinessCaution(pre) {
    const sleep = number(pre?.sleepHours), battery = number(pre?.battery), score = number(pre?.sleepScore);
    return (sleep !== null && sleep < 6) || (battery !== null && battery < 30) ||
      (score !== null && score < 50) || /^(bad|poor|low|slabo|słabo|zle|źle|tired|1|2)$/i.test(String(pre?.feeling ?? ''));
  }
  function prepare({sessions, exercise, target = null, sessionMode = 'standard', preWorkout, activeFlag, planId, slotIndex, plan, adaptiveRecovery = false} = {}) {
    if (!exercise?.id) return { rows: [], reason: 'missing_exercise' };
    if (timedCore?.measurementType(exercise)==='duration') return timed.prepare({sessions,exercise,target,sessionMode,activeFlag,planId,slotIndex,cautionToday:readinessCaution(preWorkout)});
    const history = historyFor(sessions, exercise.id, {planId, slotIndex});
    const standard = history.filter(s => s.sessionMode !== 'recovery');
    const recovery = history.filter(s => s.sessionMode === 'recovery');
    const isRecovery = sessionMode === 'recovery';
    const reference = isRecovery ? (recovery[0] ?? standard[0]) : standard[0];
    const prior = reference?.sets ?? [];
    const standardRows = standard[0]?.sets ?? [];
    const bodyweight = /^(?:masa ciała|ciężar własny|bodyweight|bez obciążenia)$/i.test(String(exercise.equipmentType ?? exercise.equipment ?? ''));
    const equipment = exercise.equipmentType ?? exercise.equipment;
    const assisted=observation.isAssistedLoad(exercise);
    const equipmentType = !assisted&&supportedEquipment.has(equipment) ? equipment : 'unknown';
    const count = clamp(integer(target?.sets) ?? (Array.isArray(target?.setDetails) && target.setDetails.length ? target.setDetails.length : null) ?? (prior.length || (target || Number.isInteger(slotIndex) ? 3 : 1)), 1, MAX_SETS);
    const overall = repRange(target?.reps);
    // A free workout uses the last demonstrated rep range, not a universal 8–12 goal.
    const topRows = standardRows.filter(row => !warmup(row));
    const topWeight = topRows.length ? Math.max(...topRows.map(row => Number(row.weight))) : null;
    const topReps = topRows.filter(row => Number(row.weight) === topWeight).map(row => Number(row.reps));
    const inferred = topReps.length ? { min: Math.min(...topReps), max: Math.max(...topReps) } : { min: 8, max: 12 };
    const range = overall ?? inferred;
    const plannedRir = number(target?.rir);
    const explicitRir = plannedRir !== null && Number.isInteger(plannedRir) && plannedRir >= 0 && plannedRir <= 5;
    const explicitWarmup = observation.isWarmup;
    const expectedWorkingSets = count - Array.from({length: count}, (_, i) => target?.setDetails?.[i]).filter(explicitWarmup).length;
    const uniformTargets = Array.from({length: count}, (_, i) => i).filter(i => !explicitWarmup(target?.setDetails?.[i])).every(i => {
      const rowRange = targetRange(target, i);
      return rowRange?.min === overall?.min && rowRange?.max === overall?.max &&
        number(target?.setDetails?.[i]?.rir ?? target?.rir) === plannedRir;
    });
    const advice = progression.suggest(history, exercise.id, { exercise,minReps: range.min, maxReps: range.max, equipmentType, equipmentStepKg: exercise.equipmentStepKg,
      ...(explicitRir ? {targetRir: plannedRir, expectedWorkingSets: overall && uniformTargets ? expectedWorkingSets : 0} : {}) });
    const recentFlag = (Array.isArray(sessions) ? sessions : []).filter(s => typeof s?.date === 'string' && Number.isFinite(Date.parse(s.date)) && (s.exerciseNotes?.[exercise.id] || validRows(s,exercise.id).length)).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,5).some(s => flags.has(s.exerciseNotes?.[exercise.id]?.flag));
    const broadDecline = plan?.id === planId && adaptive?.assessPlan({sessions,plan})?.status === 'broad_decline';
    const caution = recentFlag || flags.has(activeFlag) || readinessCaution(preWorkout) || broadDecline;
    const hasTimedTarget = /\b(?:s|sek\.?|sekund|min\.?|maks\.?)\s*$/i.test(String(target?.reps ?? ''));
    const mayIncrease = !isRecovery && !caution && !hasTimedTarget && advice.action === 'consider_increase' && Number.isFinite(advice.suggestedWeight) && (overall !== null || target?.reps == null || target?.reps === '');
    const rows = Array.from({length: count}, (_, i) => {
      const detail = target?.setDetails?.[i];
      const previous = prior[i];
      const plannedRir = number(detail?.rir ?? target?.rir);
      const targetRir = plannedRir !== null && Number.isInteger(plannedRir) && plannedRir >= 0 && plannedRir <= 5 ? plannedRir : 2;
      const hasExplicitClass=detail?.setType!=null||detail?.type!=null;
      const isWarmup=hasExplicitClass?warmup(detail):warmup(previous);
      const range = targetRange(target, i);
      let kg = weight(previous?.weight) ?? weight(detail?.weight) ?? weight(target?.weight);
      let reps = isWarmup && previous && !detail?.reps ? integer(previous.reps) : range ? (previous ? Math.min(Number(previous.reps),range.max) : range.min) : integer(previous?.reps);
      if (hasTimedTarget || (detail?.reps != null && !range)) reps = null;
      if (bodyweight && kg === null) kg = 0;
      if (assisted) { kg=null; }
      else if (recentFlag || flags.has(activeFlag)) { if (!bodyweight) kg = null; }
      else if (isRecovery && kg !== null && kg > 0) {
        const normal = weight(standardRows[i]?.weight);
        // Do not invent equipment-compatible weights when no recovery reference exists.
        if (adaptiveRecovery === true && !recovery.length && !isWarmup && equipmentType!=='unknown' && normal!==null && normal>0) {
          const config=progression.EQUIPMENT_CONFIG[progression.resolveEquipmentType(equipmentType,normal)];
          const step=number(exercise.equipmentStepKg)??config?.step;
          kg=recoveryEngine?.prescribe({rows:[{setType:'W',weight:normal,reps:integer(standardRows[i]?.reps)}],step})?.[0]?.weight??null;
        } else if ((!recovery.length && !isWarmup) || !previous || (normal !== null && kg > normal)) kg = null;
      } else if (!caution && !isRecovery && !isWarmup && previous && advice.action === 'consider_decrease' && Number.isFinite(advice.suggestedWeight) && Number(previous.weight) === advice.weight) {
        kg = advice.suggestedWeight;
        if (range) reps = range.min;
      } else if (mayIncrease && !isWarmup && previous && Number(previous.weight) === advice.weight) {
        kg = advice.suggestedWeight;
        if (range) reps = range.min;
        else reps = Math.min(Number(previous.reps), inferred.min);
      } else if (!caution && !isRecovery && !isWarmup && previous && Number.isInteger(number(previous.rir)) && number(previous.rir) <= 5 && number(previous.rir) >= (explicitRir ? targetRir + 1 : 2) && advice.action !== 'review' && (range ? Number(previous.reps) < range.max : !target && Number(previous.reps) < 30)) {
        // Progress repetitions from actual performance; never force a missed lower goal.
        reps = Math.min(range?.max ?? 30, Number(previous.reps) + 1);
      }
      if (!previous && !range && !hasTimedTarget) reps = null;
      return { weight: kg, reps, setType: isWarmup ? 'R' : 'W', targetRir: isWarmup || isRecovery ? 4 : targetRir };
    });
    const targets = rows.flatMap((row,index) => {
      if (row.setType !== 'W') return [];
      const range = targetRange(target,index);
      const rir = number(target?.setDetails?.[index]?.rir ?? target?.rir);
      return [{ ...range, rir, index }];
    });
    const candidate = !assisted && !bodyweight && !hasTimedTarget && !caution && !isRecovery &&
      advice.action !== 'review' && advice.action !== 'consider_decrease' && target &&
      targets.every(t => Number.isInteger(t.min) && Number.isInteger(t.rir))
      ? adaptive?.evaluate({sessions,exerciseId:exercise.id,planId,slotIndex,targets,
          equipmentType: equipmentType === 'unknown' ? 'unknown' : progression.resolveEquipmentType(equipmentType,topWeight),
          equipmentStepKg:exercise.equipmentStepKg,sessionMode,caution}) : null;
    if (candidate) targets.forEach((t,i) => {
      const next = candidate.recommendations[i];
      if (next && rows[t.index].weight !== null) {
        rows[t.index] = {...rows[t.index],weight:next.weight,reps:next.reps,...(explanation?{explanation:explanation.explain({reason:next.reason,observations:candidate.observations,comparable:true})}:{})};
      }
    });
    // Only remove a trailing working-set suffix; never shift original plan indices.
    if(adaptiveRecovery === true && isRecovery && !recentFlag && !flags.has(activeFlag) && !bodyweight && !hasTimedTarget && equipmentType!=='unknown' && standardRows.length && rows.every(r=>r.weight!==null)){
      const working=rows.filter(r=>r.setType==='W').length;
      let remove=working-Math.ceil(working*0.75);
      while(remove>0&&rows.at(-1)?.setType==='W'){rows.pop();remove--;}
    }
    return { rows, advice, action: advice.action, reason: assisted || recentFlag || flags.has(activeFlag) ? 'review' : isRecovery ? 'recovery' : caution ? 'readiness' : mayIncrease || advice.action === 'consider_decrease' ? 'progression' : reference ? 'history' : 'plan' };
  }
  return Object.freeze({ prepare, repRange, readinessCaution, isTimedExercise:exercise=>timedCore?.measurementType(exercise)==='duration' });
});
