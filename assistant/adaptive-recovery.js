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
  return Object.freeze({recommend});
});
