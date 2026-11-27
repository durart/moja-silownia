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
  function normalize(value){
    if(!value||!Object.values(reasons).includes(value.reason))return null;
    const reason=value.reason==='safety_review'?'review':value.reason;
    return explain({reason,observations:value.observations,comparable:true});
  }
  function label(value){
    const e=normalize(value);
    if(!e)return '';
    const labels={increase_weight:'Zwiększenie ciężaru',increase_reps:'Zwiększenie powtórzeń',maintain:'Utrzymanie parametrów',safety_review:'Sprawdź bezpieczeństwo',recovery:'Regeneracja',readiness:'Ostrożność ze względu na gotowość',insufficient_data:'Brak porównywalnych danych'};
    const confidence={low:'niska',moderate:'umiarkowana',high:'wysoka'};
    return labels[e.reason]+' · Porównywalne treningi: '+e.observations+' · Wiarygodność: '+confidence[e.confidence];
  }
  return Object.freeze({explain,normalize,label});
});
