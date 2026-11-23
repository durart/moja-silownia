/* Pure view model for the interactive muscle atlas. No storage or DOM writes. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MuscleAtlasCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const MUSCLES=Object.freeze(['Klatka piersiowa','Plecy','Barki','Biceps','Triceps','Brzuch','Nogi','Łydki','Przedramiona']);
 const clamp=value=>Math.max(0,Math.min(100,Math.round(value)));
 function level(score){return score>=65?'high':score>=35?'medium':score>0?'low':'none';}
 function label(score){return score>=65?'Wysokie':score>=35?'Umiarkowane':score>0?'Niskie':'Brak';}
 function buildModel(sessions,exercises,fatigueCore,now=Date.now()){
  const safeSessions=Array.isArray(sessions)?sessions:[];
  const safeExercises=Array.isArray(exercises)?exercises:[];
  const scores=typeof fatigueCore?.fatigue==='function'?fatigueCore.fatigue(safeSessions,safeExercises,now):{};
  return MUSCLES.map(name=>{
   const raw=scores?.[name],score=Number.isFinite(Number(raw))?clamp(Number(raw)):0;
   return Object.freeze({name,score,level:level(score),label:label(score),exerciseCount:safeExercises.filter(ex=>ex?.group===name).length});
  });
 }
 function getMuscle(model,name){return (Array.isArray(model)?model:[]).find(item=>item.name===name)||null;}
 return Object.freeze({MUSCLES,level,label,buildModel,getMuscle});
});
