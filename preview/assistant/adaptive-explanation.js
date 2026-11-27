/* Explain observed progression decisions without inventing evidence. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.MojaAdaptiveExplanation=api;
})(globalThis,function(){
  'use strict';
  const reasons=Object.freeze({
    increase_weight:'increase_weight',
    increase_reps:'increase_reps',
    maintain:'maintain',
    review:'safety_review',
    recovery:'recovery',
    readiness:'readiness',
    insufficient_data:'insufficient_data'
  });
  function explain({reason,observations=0,comparable=false}={}){
    const known=Object.hasOwn(reasons,reason);
    const count=Number.isSafeInteger(observations)&&observations>=0&&observations<=6?observations:0;
    const evidenceCount=comparable===true?count:0;
    return Object.freeze({reason:known?reasons[reason]:'insufficient_data',
      observations:evidenceCount,
      confidence:known&&['increase_weight','increase_reps','maintain'].includes(reason)&&evidenceCount>=3?(evidenceCount>=4?'high':'moderate'):'low'});
  }
  return Object.freeze({explain});
});
