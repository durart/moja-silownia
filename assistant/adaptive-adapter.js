/* Strict plan-slot adapter. No fallback to ambiguous legacy history. */
(function(root,factory){
  const common=typeof module==='object'&&module.exports;
  const api=factory(common?require('./adaptive-evidence.js'):root.MojaAdaptiveEvidence,
    common?require('./adaptive-prescription.js'):root.MojaAdaptivePrescription,
    common?require('./adaptive-trends.js'):root.MojaAdaptiveTrends);
  if(common) module.exports=api; else root.MojaAdaptiveAdapter=api;
})(globalThis,function(evidence,prescription,trends){
  'use strict';
  function collect({sessions,exerciseId,planId,slotIndex,targets,
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
          rows.every(r=>r.reliable!==false&&r.unreliable!==true&&Number.isFinite(r.weight)&&r.weight>0&&Number.isInteger(r.reps)&&r.reps>0&&Number.isInteger(r.rir)&&r.rir>=0&&r.rir<=5);
        return {...s,sets:valid?rows:[],invalid:!valid};
      }).filter(Boolean).filter(s=>typeof s.date==='string'&&Number.isFinite(Date.parse(s.date))&&Date.parse(s.date)<=now)
      .sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
    if(history.slice(0,5).some(s=>['pain','equipment','technique'].includes(s.exerciseNotes?.[exerciseId]?.flag))) return null;
    const standard=history.filter(s=>s.sessionMode!=='recovery');
    if(!standard.length || now-Date.parse(standard[0].date)>42*86400000) return null;
    const boundary=standard.findIndex(s=>s.invalid);
    const result=evidence.analyze(boundary<0?standard:standard.slice(0,boundary),exerciseId,{expectedWorkingSets:targets.length,now});
    if(result.status!=='comparable') return null;
    return result.samples;
  }
  function assessPlan({sessions,plan,now=Date.now()}={}) {
    if(!Array.isArray(plan?.exerciseIds)||!Array.isArray(plan.targets)||!trends) return {status:'insufficient_data'};
    const entries=plan.exerciseIds.flatMap((id,slotIndex)=>{
      const target=plan.targets[slotIndex];
      const count=Number(target?.sets);
      if(!Number.isInteger(count)||count<1||count>30) return [];
      const targets=Array.from({length:count},(_,index)=>({index})).filter(t=>!['R','warmup'].includes(target.setDetails?.[t.index]?.setType)&&target.setDetails?.[t.index]?.type!=='warmup');
      const samples=collect({sessions,exerciseId:id,planId:plan.id,slotIndex,targets,now});
      return samples?[{exerciseId:String(id),samples}]:[];
    });
    return trends.summarize(entries);
  }
  function suggest(input={}) {
    const samples=collect(input);
    if(!samples) return null;
    const {targets,equipmentType,equipmentStepKg}=input;
    const trend=trends?.classify(samples);
    return prescription.prescribe({samples:samples.map(s=>s.rows),targets,equipmentType,equipmentStepKg,caution:!trend||trend.confidence==='low'||trend.status==='declining'||trend.status==='observe'});
  }
  return Object.freeze({suggest,assessPlan});
});
