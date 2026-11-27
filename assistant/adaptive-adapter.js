/* Strict plan-slot adapter. No fallback to ambiguous legacy history. */
(function(root,factory){
  const common=typeof module==='object'&&module.exports;
  const api=factory(common?require('./adaptive-evidence.js'):root.MojaAdaptiveEvidence,
    common?require('./adaptive-prescription.js'):root.MojaAdaptivePrescription);
  if(common) module.exports=api; else root.MojaAdaptiveAdapter=api;
})(globalThis,function(evidence,prescription){
  'use strict';
  function suggest({sessions,exerciseId,planId,slotIndex,targets,equipmentType,equipmentStepKg,
    caution=false,sessionMode='standard',now=Date.now()}={}){
    if(!evidence||!prescription||planId==null||!Number.isInteger(slotIndex)||slotIndex<0||
      exerciseId==null||!Array.isArray(targets)||caution!==false||sessionMode!=='standard') return null;
    const history=(Array.isArray(sessions)?sessions:[]).filter(s=>s&&Array.isArray(s.sets))
      .map(s=>{
        const rows=s.sets.filter(r=>r&&String(r.exerciseId)===String(exerciseId)&&
          r.planId===planId&&r.planSlotIndex===slotIndex&&
          r.setType!=='R'&&r.type!=='warmup'&&r.type!=='R');
        if(!rows.length) return null;
        const indices=rows.map(r=>r.planSetIndex);
        const expected=targets.map((t,i)=>t?.index ?? i);
        const valid=rows.length===targets.length&&indices.every((n,i)=>Number.isInteger(n)&&n===expected[i])&&
          rows.every(r=>r.reliable!==false&&r.unreliable!==true);
        return {...s,sets:valid?rows:[],invalid:!valid};
      }).filter(Boolean).filter(s=>typeof s.date==='string'&&Number.isFinite(Date.parse(s.date))&&Date.parse(s.date)<=now)
      .sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
    if(history.slice(0,5).some(s=>['pain','equipment','technique'].includes(s.exerciseNotes?.[exerciseId]?.flag))) return null;
    const standard=history.filter(s=>s.sessionMode!=='recovery');
    if(!standard.length || now-Date.parse(standard[0].date)>42*86400000) return null;
    const boundary=standard.findIndex(s=>s.invalid);
    const result=evidence.analyze(boundary<0?standard:standard.slice(0,boundary),exerciseId,{expectedWorkingSets:targets.length,now});
    if(result.status!=='comparable') return null;
    return prescription.prescribe({samples:result.samples.map(s=>s.rows),targets,equipmentType,equipmentStepKg,caution});
  }
  return Object.freeze({suggest});
});
