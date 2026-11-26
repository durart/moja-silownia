// Conservative cardio recommendation rules; targets are distinct from achieved results.
(function(root,factory){const node=typeof module==='object'&&module.exports;const api=factory(node?require('./cardio-catalog.js'):root.MojaCardioCatalog,node?require('./cardio-core.js'):root.MojaCardioCore);if(node)module.exports=api;if(root)root.MojaCardioProgression=api;})(typeof globalThis!=='undefined'?globalThis:this,function cardioProgression(catalog,core){
 'use strict';
 const copyMetrics=a=>Object.fromEntries(['durationSeconds','speedKmh','inclinePercent'].filter(k=>core.validMetric(k,a?.[k])).map(k=>[k,a[k]]));
 const validDate=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
 function history(exerciseId,sessions){
   return (Array.isArray(sessions)?sessions:[]).filter(s=>s&&s.sessionMode!=='recovery'&&validDate(s.date))
     .map(s=>({date:s.date,activity:(Array.isArray(s.cardio)?s.cardio:[]).filter(a=>a?.exerciseId===exerciseId&&core.validMetric('durationSeconds',a.durationSeconds)&&validDate(a.at)).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at))[0]}))
     .filter(s=>s.activity).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
 }
 function comparable(a,b,exerciseId){
   if(!a||!b||Math.abs(a.durationSeconds-b.durationSeconds)>Math.max(60,b.durationSeconds*.1))return false;
   const ex=catalog.getExercise(exerciseId);
   for(const key of ['speedKmh','inclinePercent']){
     if(!ex.metrics.includes(key))continue;
     const av=core.validMetric(key,a[key]),bv=core.validMetric(key,b[key]);
     if(av!==bv||av&&Math.abs(a[key]-b[key])>.11)return false;
     // Unknown treadmill intensity cannot be treated as a comparable workload.
     if(exerciseId.startsWith('cardio-treadmill-')&&!av)return false;
   }
   for(const key of ['distanceMeters','floors','paceSecondsPer500m']){
     if(!ex.metrics.includes(key))continue;
     const av=core.validMetric(key,a[key]),bv=core.validMetric(key,b[key]);
     if(av!==bv)return false;
     if(av){const rateA=key==='paceSecondsPer500m'?a[key]:a[key]/a.durationSeconds;
       const rateB=key==='paceSecondsPer500m'?b[key]:b[key]/b.durationSeconds;
       if(Math.abs(rateA-rateB)>rateB*.1)return false;}
   }
   return true;
 }
 function suggest(exerciseId,sessions,{sessionMode='standard',now=Date.now()}={}){
   if(!catalog.getExercise(exerciseId))return null;
   const previous=history(exerciseId,sessions),last=previous[0],prior=previous[1];
   if(!last)return {action:'initial',reason:'no-history',target:{}};
   const a=last.activity,target=copyMetrics(a);
   const result=(action,reason,changedMetric)=>({action,reason,target:{...target},...(changedMetric?{changedMetric}:{}),sourceActivityId:a.id});
   if(sessionMode==='recovery')return result('maintain','recovery');
   if(!Number.isFinite(now)||now-Date.parse(last.date)>21*86400000||now<Date.parse(last.date))return result('maintain','history-gap');
   if(core.validMetric('rpe',a.rpe)&&a.rpe>=8)return result('maintain','high-rpe');
   if(!prior||last.date.slice(0,10)===prior.date.slice(0,10))return result('maintain','need-two-sessions');
   if(!core.validMetric('rpe',a.rpe)||!core.validMetric('rpe',prior.activity.rpe))return result('maintain','missing-rpe');
   if(a.rpe>5||prior.activity.rpe>5)return result('maintain','effort');
   if(!comparable(a,prior.activity,exerciseId))return result('maintain','not-comparable');
   const treadmill=exerciseId.startsWith('cardio-treadmill-');
   const timeLimit=treadmill?1800:2700;
   if(target.durationSeconds<timeLimit){
     const increment=Math.max(1,Math.min(120,Math.floor(target.durationSeconds*.05)));
     target.durationSeconds=Math.min(timeLimit,target.durationSeconds+increment);
     return result('increase','duration','durationSeconds');
   }
   if(exerciseId==='cardio-treadmill-walk'&&target.inclinePercent>=0&&target.inclinePercent<10){
     target.inclinePercent=Math.min(10,Math.round((target.inclinePercent+.5)*10)/10);
     return result('increase','incline','inclinePercent');
   }
   const speedLimit=exerciseId==='cardio-treadmill-walk'?6:12;
   if(treadmill&&target.inclinePercent>=0&&target.inclinePercent<=10&&target.speedKmh<speedLimit){
     target.speedKmh=Math.min(speedLimit,Math.round((target.speedKmh+(exerciseId==='cardio-treadmill-walk'?.1:.2))*10)/10);
     return result('increase','speed','speedKmh');
   }
   return result('maintain','at-limit');
 }
 function initialDraft(recommendation){
   if(!recommendation)return {};
   const {speedKmh,inclinePercent}=recommendation.target;
   return {...(speedKmh!=null?{speedKmh}:{}),...(inclinePercent!=null?{inclinePercent}:{})};
 }
 return Object.freeze({suggest,initialDraft,comparable});
});
