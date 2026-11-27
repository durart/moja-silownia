/* Performance signals, not physiological diagnoses. */
'use strict';
function classify(samples) {
  if(!Array.isArray(samples)||samples.length<3||samples.length>6||!samples.every(s=>s&&Number.isSafeInteger(s.reps)&&s.reps>0&&Number.isSafeInteger(s.reserve)&&s.reserve>=0)) return {status:'insufficient_data',confidence:'low'};
  const score=s=>s.reps+s.reserve;
  const [a,b,c]=samples.slice(0,3).map(score);
  const status=a<b&&b<c&&a<=c*0.9?'declining':a>b&&b>=c?'improving':samples.length>=4&&samples.slice(0,4).every(s=>score(s)===a)?'stagnation':a<b?'observe':'stable';
  return {status,confidence:samples.length>=4?'high':'moderate'};
}
function summarize(entries) {
  const unique=new Map();
  for(const entry of Array.isArray(entries)?entries:[]){
    if(typeof entry?.exerciseId!=='string'||!entry.exerciseId)continue;
    unique.set(entry.exerciseId,unique.has(entry.exerciseId)?null:classify(entry.samples));
  }
  const eligible=[...unique.values()].filter(x=>x&&x.confidence!=='low');
  const declining=eligible.filter(x=>x.status==='declining').length;
  return {status:eligible.length>=3&&declining>=2&&declining/eligible.length>=0.5?'broad_decline':declining?'local_decline':eligible.length?'no_decline_detected':'insufficient_data',eligible:eligible.length,declining};
}
module.exports=Object.freeze({classify,summarize});
