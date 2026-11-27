/* Read-only recovery recommendation; never changes the selected workout mode. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.MojaAdaptiveRecovery=api;
})(globalThis,function(){
  'use strict';
  function recommend({assessment,readinessCaution=false,sessionMode='standard',reviewRequired=false}={}){
    if(reviewRequired===true) return {action:'review',reason:'safety_flag'};
    if(sessionMode!=='standard') return {action:'none',reason:'mode_selected'};
    if(assessment?.status==='broad_decline'&&assessment.eligible>=3&&assessment.declining>=2&&assessment.declining/assessment.eligible>=0.5)
      return {action:'offer_recovery',reason:readinessCaution===true?'combined_signals':'broad_decline',requiresConfirmation:true};
    if(readinessCaution===true) return {action:'offer_recovery',reason:'readiness',requiresConfirmation:true};
    return {action:'none',reason:'insufficient_recovery_signal'};
  }
  function prescribe({rows,step,reviewRequired=false}={}){
    if(reviewRequired||!Array.isArray(rows)||!Number.isFinite(step)||step<=0||step>20) return null;
    const working=rows.filter(r=>r?.setType==='W');
    if(!working.length||working.some(r=>!Number.isFinite(r.weight)||r.weight<=0||!Number.isInteger(r.reps)||r.reps<1)) return null;
    const keep=Math.max(1,Math.ceil(working.length*0.75));
    let index=0;
    return rows.flatMap(row=>{
      if(row.setType!=='W') return [{...row}];
      if(index++>=keep) return [];
      const steps=Math.max(1,Math.round(row.weight*0.125/step));
      const weight=Number((row.weight-steps*step).toFixed(2));
      return [{...row,weight:weight>0&&weight>=row.weight*0.8?weight:null,targetRir:4}];
    });
  }
  return Object.freeze({recommend,prescribe});
});
