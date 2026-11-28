/* Read-only interpretation of training observations, including legacy records. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MojaSetObservation=api;
})(globalThis,function(){
 'use strict';
 function number(value){
  if(typeof value!=='number'&&(typeof value!=='string'||value.trim()===''))return null;
  const n=Number(value);
  return Number.isFinite(n)?n:null;
 }
 function rir(value){
  if(value==null||(typeof value==='string'&&value.trim()===''))return {status:'missing',value:null};
  const n=number(value);
  return Number.isInteger(n)&&n>=0&&n<=5?{status:'valid',value:n}:{status:'invalid',value:null};
 }
 function setClass(row){
  if(!row||typeof row!=='object')return 'unknown';
  const decode=value=>{
   if(value==null||value==='')return null;
   if(value==='W'||value==='working')return 'working';
   if(value==='R'||value==='warmup')return 'warmup';
   return 'unknown';
  };
  const declared=decode(row.setType),legacy=decode(row.type);
  if(declared==='unknown'||legacy==='unknown')return 'unknown';
  if(declared&&legacy&&declared!==legacy)return 'conflict';
  return declared||legacy||'working';
 }
 const isWorking=row=>setClass(row)==='working';
 const isWarmup=row=>setClass(row)==='warmup';
 const isReliable=row=>!!row&&row.reliable!==false&&row.unreliable!==true;
 const isTrustedWorking=row=>isWorking(row)&&isReliable(row);
 function isAssistedLoad(value){
  const id=typeof value==='string'?value:String(value?.exerciseId??value?.id??'');
  return id==='seed-28'||value?.resistanceKind==='assisted_load'||value?.weightConvention==='assistance'||
   /(?:^|\s)z (?:asystą|przeciwwagą)(?:\s|$)|\bassisted\b/iu.test(String(value?.name??''));
 }
 function validRepetitions(row){
  const kg=number(row?.weight),reps=number(row?.reps);
  return !!row&&row.measurementType!=='duration'&&row.measurementType!=='cardio'&&kg!==null&&kg>=0&&Number.isSafeInteger(reps)&&reps>0;
 }
 return Object.freeze({number,rir,setClass,isWorking,isWarmup,isReliable,isTrustedWorking,isAssistedLoad,validRepetitions});
});
