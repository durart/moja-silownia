/* Pure policy for a trusted working slot. Integration must supply verified context and safety clearance. */
(function(root,factory){
 const common=typeof module==='object'&&module.exports;
 const api=factory(common?require('../modules/set-observation.js'):root.MojaSetObservation,
   common?require('./assistant-progression.js'):root.MojaAdvisorProgression);
 if(common)module.exports=api;else root.MojaIntelligentProgression=api;
})(globalThis,function(observation,progression){
 'use strict';
 const VERSION='ipe-1';
 const validTarget=t=>Number.isSafeInteger(t?.min)&&t.min>=1&&Number.isSafeInteger(t.max)&&t.max>=t.min&&t.max<=10000&&Number.isInteger(t.rir)&&t.rir>=0&&t.rir<=5;
 const validRow=r=>observation.isTrustedWorking(r)&&observation.validRepetitions(r)&&Number(r.weight)>0&&Number(r.reps)<=10000&&observation.rir(r.rir).status==='valid'&&!observation.isAssistedLoad(r);
 function decide({samples, target, equipmentType, equipmentStepKg, comparable=false, safetyCleared=false}={}){
  const first=Array.isArray(samples)?samples[0]:null;
  const reference=observation.isTrustedWorking(first)&&observation.validRepetitions(first)?{weight:Number(first.weight),reps:Number(first.reps)}:{weight:null,reps:null};
  const base=(action,reason,extra={})=>({version:VERSION,action,reason,...reference,observations:0,...extra});
  // Clearance is intentionally explicit; this module cannot authenticate context itself.
  if(safetyCleared!==true)return base('review','safety_block');
  if(comparable!==true)return base('hold','reference_only');
  if(!validTarget(target))return base('review','invalid_target');
  if(!validRow(first))return base('review','invalid_observation');
  const current={weight:Number(first.weight),reps:Number(first.reps),rir:observation.rir(first.rir).value};
  const previous=samples[1];
  const repeated=validRow(previous)&&Number(previous.weight)===current.weight;
  const result=(action,reason,extra={})=>base(action,reason,{observations:repeated?2:1,...extra});
  if(current.reps>target.max)return result('review','above_target');
  if(current.reps<target.min)return result('review','below_target');
  if(current.rir<=1||current.rir<target.rir)return result('hold','reserve_too_low');
  if(current.reps<target.max){
   return current.rir>=target.rir+1
    ?result('increase_reps','reserve_for_repetition',{reps:current.reps+1})
    :result('hold','within_target');
  }
  const fast=current.rir>=Math.max(3,target.rir+1);
  const confirmed=repeated&&current.rir>=Math.max(2,target.rir)&&Number(previous.reps)===target.max&&observation.rir(previous.rir).value>=Math.max(2,target.rir);
  if(!fast&&!confirmed)return result('hold','confirm_target');
  const load=progression.calculateNextWeight(current.weight,equipmentType,equipmentStepKg);
  if(!Number.isFinite(load?.suggestedWeight))return result('hold',load?.blockedByStep?'step_too_large':'equipment_review');
  return result('increase_weight',fast?'high_reserve':'confirmed_target',{weight:load.suggestedWeight,reps:target.min, tentative:fast&&!confirmed});
 }
 return Object.freeze({decide,VERSION});
});
