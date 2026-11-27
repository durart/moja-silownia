// Cardio plan targets and active context, separate from actual recorded activities.
(function(root,factory){const node=typeof module==='object'&&module.exports;const api=factory(node?require('./cardio-catalog.js'):root.MojaCardioCatalog,node?require('./cardio-core.js'):root.MojaCardioCore,node?require('./cardio-progression.js'):root.MojaCardioProgression);if(node)module.exports=api;if(root)root.MojaCardioPlans=api;})(typeof globalThis!=='undefined'?globalThis:this,function planCore(catalog,core,progression){
 'use strict';
 function keys(id){const ex=catalog.getExercise(id);return ex?ex.metrics.filter(k=>['durationSeconds','speedKmh','inclinePercent'].includes(k)):[];}
 function normalizeTarget(id,target){
  if(!catalog.getExercise(id)||!target||target.measurementType!=='cardio')return null;
  const result={measurementType:'cardio'};
  for(const key of keys(id)){if(target[key]==null)continue;if(!core.validMetric(key,target[key]))throw new RangeError('Invalid cardio plan target: '+key);result[key]=target[key];}
  return result;
 }
 function duplicates(ids){const seen=new Set();return (ids||[]).some(id=>catalog.getExercise(id)&&(seen.has(id)||!seen.add(id)));}
 function validatePlans(plans){
  for(const plan of plans||[]){
   if(duplicates(plan.exerciseIds))throw new Error('Plan zawiera powtórzone ćwiczenie kardio.');
   for(let i=0;i<(plan.exerciseIds||[]).length;i++){
    const target=plan.targets?.[i],id=plan.exerciseIds[i];
    if(target?.measurementType==='cardio'&&!normalizeTarget(id,target))throw new Error('Nieprawidłowy cel kardio w planie.');
   }
  }
 }
 function recommendation(id,history,target,options){
  const planned=normalizeTarget(id,target),suggestion=progression.suggest(id,history,options);
  if(!planned)return suggestion;
  const {measurementType,...values}=planned;
  if(!Object.keys(values).length)return suggestion;
  // Explicit plan parameters are the baseline until the history supplies a comparable, achieved workload.
  const suggested=suggestion?.target||{};
  if(!Object.keys(suggested).length)return {action:'initial',reason:'plan-target',target:values};
  // Do not replace a harder/easier result recorded by the user with an old plan baseline.
  return {...suggestion,target:{...values,...suggested}};
 }
 function activeSlot(state,id){
  if(state.activePlan==null)return null;
  const plan=state.plans?.find(p=>p.id===state.activePlan);
  if(!plan)return null;
  const index=(plan.exerciseIds||[]).findIndex((ex,i)=>!(state.hiddenWorkoutSlots||[]).includes(i)&&(state.workoutSwaps?.[i]||ex)===id);
  return index<0?null:index;
 }
 function inContext(state,id){
  if(!catalog.getExercise(id)||!state.startedAt)return false;
  if(state.activePlan!=null)return activeSlot(state,id)!==null||(state.planExtraExerciseIds||[]).includes(id);
  return !!state.manualStarted&&(state.manualExerciseIds||[]).includes(id);
 }
 return Object.freeze({keys,normalizeTarget,duplicates,validatePlans,recommendation,activeSlot,inContext});
});
