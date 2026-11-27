/* Conservative per-set prescription for adaptive workout drafts. */
(function(root, factory) {
  const common = typeof module === 'object' && module.exports;
  const api = factory(common ? require('./assistant-progression.js') : root.MojaAdvisorProgression);
  if (common) module.exports = api;
  else root.MojaAdaptivePrescription = api;
})(globalThis, function(progression) {
'use strict';

function prescribe({ samples, targets, equipmentType, equipmentStepKg, caution = false } = {}) {
  if (!Array.isArray(samples) || !Array.isArray(targets) || targets.length < 1 ||
      targets.length > 30 || samples.length < 3 || samples.length > 6) return null;
  if (!samples.every(s => Array.isArray(s) && s.length === targets.length)) return null;
  const valid = r => r && Number.isFinite(r.weight) && r.weight > 0 &&
    Number.isSafeInteger(r.reps) && r.reps > 0 && r.reps <= 10000 &&
    Number.isInteger(r.rir) && r.rir >= 0 && r.rir <= 5;
  if (!samples.every(s => s.every(valid))) return null;
  if (!targets.every(t => t && Number.isSafeInteger(t.min) && Number.isSafeInteger(t.max) &&
      t.min > 0 && t.max >= t.min && t.max <= 10000 &&
      Number.isInteger(t.rir) && t.rir >= 0 && t.rir <= 5)) return null;
  return targets.map((target,i) => {
    const rows = samples.map(s => s[i]);
    const last = rows[0];
    const hold = { weight: last.weight, reps: last.reps, reason: 'maintain' };
    if (caution !== false || rows.some(r => r.weight !== last.weight || r.reps > target.max ||
        r.reps < target.min || r.rir < target.rir)) return hold;
    if (rows.slice(0,3).every(r => r.reps === target.max && r.rir >= Math.max(2,target.rir))) {
      if (!Object.hasOwn(progression.EQUIPMENT_CONFIG,equipmentType)) return hold;
      const next = progression.calculateNextWeight(last.weight,equipmentType,equipmentStepKg);
      if (Number.isFinite(next?.suggestedWeight)) return {weight:next.suggestedWeight,reps:target.min,reason:'increase_weight'};
    }
    if (last.reps < target.max && last.rir >= target.rir + 1 &&
        last.reps >= rows[1].reps && rows[1].reps >= rows[2].reps)
      return {...hold,reps:last.reps+1,reason:'increase_reps'};
    return hold;
  });
}
return Object.freeze({ prescribe });

});
