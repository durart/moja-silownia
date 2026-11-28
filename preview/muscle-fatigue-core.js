/* Single Source of Truth: profiles, fatigue impulse and exponential decay. Pure UMD module. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.MuscleFatigueCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const GROUPS={'Klatka piersiowa':[['Klatka piersiowa',1],['Triceps',.45],['Barki',.45]],'Plecy':[['Plecy',1],['Biceps',.45]],'Barki':[['Barki',1],['Triceps',.3]],'Biceps':[['Biceps',1]],'Triceps':[['Triceps',1]],'Nogi':[['Nogi',1]],'Brzuch':[['Brzuch',1]],'Łydki':[['Łydki',1]],'Przedramiona':[['Przedramiona',1]],'Inne':[['Inne',1]]};
// Reviewed exceptions to generic group profiles. Stable IDs also cover legacy aliases.
const CORRECTED_PROFILES=Object.freeze({
  'seed-12':[["Łydki",1]],
  'seed-19':[["Klatka piersiowa",1],["Barki",0.2]],
  'seed-20':[["Klatka piersiowa",1],["Barki",0.2]],
  'seed-21':[["Klatka piersiowa",1],["Barki",0.3]],
  'seed-22':[["Klatka piersiowa",1],["Barki",0.2]],
  'seed-31':[["Plecy",1]],
  'seed-37':[["Plecy",1],["Klatka piersiowa",0.3]],
  'seed-38':[["Plecy",1],["Klatka piersiowa",0.5]],
  'seed-39':[["Plecy",1],["Nogi",0.5]],
  'seed-43':[["Barki",1]],
  'seed-44':[["Barki",1]],
  'seed-45':[["Barki",1]],
  'seed-46':[["Barki",1],["Plecy",0.4]],
  'seed-47':[["Barki",1],["Plecy",0.4]],
  'seed-48':[["Barki",1],["Plecy",0.6]],
  'seed-49':[["Barki",1],["Plecy",0.4]],
  'seed-50':[["Plecy",1],["Przedramiona",0.3]],
  'seed-55':[["Biceps",1],["Przedramiona",0.6]],
  'seed-66':[["Triceps",1],["Klatka piersiowa",0.6],["Barki",0.4]],
  'seed-67':[["Triceps",1],["Klatka piersiowa",0.6],["Barki",0.4]],
  'seed-84':[["Łydki",1]],
  'seed-85':[["Łydki",1]],
  'seed-89':[["Brzuch",1],["Nogi",0.4],["Przedramiona",0.3]],
  'seed-98':[["Przedramiona",1],["Plecy",0.5],["Brzuch",0.3]],
  'cali-01':[["Klatka piersiowa",1],["Triceps",0.5],["Barki",0.45]],
  'cali-02':[["Klatka piersiowa",1],["Triceps",0.5],["Barki",0.5]],
  'cali-03':[["Triceps",1],["Klatka piersiowa",0.7],["Barki",0.4]],
  'cali-04':[["Barki",1],["Triceps",0.65]],
  'cali-05':[["Klatka piersiowa",1],["Triceps",0.5],["Barki",0.4],["Brzuch",0.3]],
  'cali-06':[["Plecy",1],["Biceps",0.5]],
  'cali-07':[["Plecy",1],["Biceps",0.5]],
  'cali-08':[["Plecy",1],["Biceps",0.5],["Przedramiona",0.3]],
  'cali-09':[["Plecy",1],["Biceps",0.45]],
  'cali-10':[["Plecy",1],["Biceps",0.45]],
  'cali-11':[["Triceps",1],["Klatka piersiowa",0.6],["Barki",0.4]],
  'cali-12':[["Nogi",1]],
  'cali-13':[["Nogi",1]],
  'cali-14':[["Nogi",1]],
  'cali-15':[["Nogi",1]],
  'cali-16':[["Nogi",1]],
  'cali-18':[["Brzuch",1]],
  'cali-19':[["Brzuch",1],["Nogi",0.4],["Przedramiona",0.3]],
  'cali-21':[["Barki",1],["Triceps",0.5],["Brzuch",0.3]],
  'cali-22':[["Plecy",1],["Przedramiona",0.3]]
});
const SPECIFIC={...CORRECTED_PROFILES,"cali-53":[["Barki",0.1]],"cali-54":[["Barki",0.1],["Plecy",0.1]],"cali-55":[["Brzuch",0.1],["Plecy",0.1]],"cali-56":[["Nogi",0.1],["Brzuch",0.1]],"cali-57":[["Nogi",0.1]],"cali-58":[["Nogi",0.1]],"cali-59":[["Nogi",0.1],["Plecy",0.1]],"cali-60":[["Nogi",0.1]],"cali-61":[["Nogi",0.1]],"cali-62":[["Klatka piersiowa",0.1],["Barki",0.1]],"cali-63":[["Plecy",0.1],["Brzuch",0.1]],"cali-64":[["Brzuch",0.02]],"cali-41":[["Plecy",0.15],["Brzuch",0.1]],"cali-42":[["Nogi",0.15],["Łydki",0.1]],"cali-43":[["Nogi",0.7],["Łydki",0.4],["Barki",0.35]],"cali-44":[["Nogi",1],["Łydki",0.5]],"cali-45":[["Nogi",1],["Łydki",0.8]],"cali-46":[["Klatka piersiowa",0.7],["Triceps",1],["Barki",0.4]],"cali-47":[["Barki",1],["Triceps",0.65]],"cali-48":[["Brzuch",0.8],["Barki",0.7],["Klatka piersiowa",0.7],["Triceps",0.5]],"cali-49":[["Brzuch",1],["Nogi",0.5],["Barki",0.4]],"cali-50":[["Łydki",1]],"cali-51":[["Nogi",1],["Brzuch",0.2]],"cali-52":[["Brzuch",1],["Barki",0.6]],"cali-23":[["Nogi",1]],"cali-24":[["Nogi",1]],"cali-25":[["Nogi",1],["Brzuch",0.25]],"cali-26":[["Łydki",1]],"cali-27":[["Nogi",1],["Brzuch",0.2]],"cali-28":[["Klatka piersiowa",1],["Triceps",0.5],["Barki",0.45]],"cali-29":[["Klatka piersiowa",1],["Triceps",0.5],["Barki",0.5],["Brzuch",0.25]],"cali-30":[["Plecy",1],["Nogi",0.5],["Barki",0.3]],"cali-31":[["Plecy",1],["Barki",0.6]],"cali-32":[["Brzuch",1],["Plecy",0.6],["Nogi",0.45]],"cali-33":[["Brzuch",1]],"cali-34":[["Brzuch",1],["Nogi",0.4]],"cali-35":[["Nogi",0.5]],"cali-36":[["Nogi",0.8],["Brzuch",0.3]],"cali-37":[["Nogi",0.7],["Barki",0.35]],"cali-38":[["Brzuch",1],["Barki",0.5],["Nogi",0.5]],"cali-39":[["Brzuch",0.8],["Barki",0.7],["Nogi",0.4]],"cali-40":[["Nogi",1],["Brzuch",0.65],["Barki",0.5]],'seed-0':[['Klatka piersiowa',1],['Barki',.6],['Triceps',.5]],'seed-1':[['Klatka piersiowa',1],['Barki',.2]],'seed-2':[['Klatka piersiowa',1],['Triceps',.5],['Barki',.5]],'seed-3':[['Plecy',1],['Biceps',.55]],'seed-4':[['Plecy',1],['Biceps',.5]],'seed-5':[['Barki',1]],'seed-6':[['Biceps',1]],'seed-7':[['Biceps',1]],'seed-8':[['Triceps',1]],'seed-9':[['Nogi',1]],'seed-10':[['Nogi',1]],'seed-11':[['Nogi',1]],'seed-13':[['Klatka piersiowa',1],['Triceps',.5],['Barki',.5]],'seed-14':[['Brzuch',1]],'seed-93':[['Brzuch',1],['Barki',.35]],'seed-99':[['Przedramiona',1],['Plecy',.4],['Barki',.3]],'cali-17':[['Brzuch',1]],'cali-20':[['Brzuch',1],['Triceps',.4],['Barki',.4]]};
const HALF_LIFE={'Klatka piersiowa':48,'Plecy':48,'Nogi':60,'Barki':42,'Biceps':36,'Triceps':36,'Brzuch':36,'Łydki':40,'Przedramiona':36,'Inne':48};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const arr=v=>Array.isArray(v)?v:[];
const num=v=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):0;
const observation=typeof module==='object'&&module.exports?require('./modules/set-observation.js'):globalThis.MojaSetObservation;
const isWarmup=observation.isWarmup;
function profile(ex){
 const id=String(ex?.id);
 return Object.hasOwn(SPECIFIC,id)?SPECIFIC[id]:Object.hasOwn(GROUPS,ex?.group)?GROUPS[ex.group]:GROUPS.Inne;
}
const catalogGroupCorrections=Object.freeze({'seed-12':['Nogi','Łydki'],'seed-84':['Nogi','Łydki'],'seed-85':['Nogi','Łydki'],'seed-50':['Barki','Plecy']});
// Correct built-in metadata by stable identity, without replacing custom records.
function normalizeCatalog(exercises){
 return arr(exercises).map(ex=>{
  if(!ex||typeof ex!=='object')return ex;
  const id=String(ex.id);
  if(Object.hasOwn(catalogGroupCorrections,id)){
   const [oldGroup,group]=catalogGroupCorrections[id];
   const groups=Array.isArray(ex.groups)?[...new Set(ex.groups.filter(g=>g!==oldGroup).concat(group))]:null;
   return {...ex,group,...(groups?{groups}:{})};
  }
  if(/^cali-(0[1-9]|1[0-9]|2[0-2])$/.test(id)){
   const groups=[...new Set([...arr(ex.groups),...profile(ex).filter(([,weight])=>weight>=.4).map(([name])=>name)])];
   return {...ex,groups};
  }
  return ex;
 });
}
function factors(set,exercises){
 const id=String(set?.exerciseId);
 const ex=arr(exercises).find(e=>String(e?.id)===id);
 return profile(ex||{id});
}
function canRecomputeMapping(session,exercises){
 const sets=arr(session?.sets);
 if(!sets.some(set=>Object.hasOwn(CORRECTED_PROFILES,String(set?.exerciseId))))return false;
 const known=new Set(arr(exercises).map(ex=>String(ex?.id)));
 return sets.every(set=>{
  if(!set||set.exerciseId==null)return false;
  const id=String(set.exerciseId);
  if(!known.has(id)&&!Object.hasOwn(SPECIFIC,id))return false;
  return set.measurementType==='duration'
   ? Number.isInteger(set.durationSeconds)&&set.durationSeconds>0&&set.durationSeconds<=86400
   : Number.isFinite(Number(set.reps))&&Number(set.reps)>0;
 });
}
function muscleLoads(session,exercises){
 const result={};
 for(const set of arr(session?.sets))for(const [muscle,weight] of factors(set,exercises))result[muscle]=(result[muscle]||0)+weight;
 return result;
}
function sessionMuscles(session,exercises){
 return !canRecomputeMapping(session,exercises)&&session?.muscles&&typeof session.muscles==='object'
  ?session.muscles:muscleLoads(session,exercises);
}
function impulse(session,exercises){const result={};for(const x of arr(session?.sets)){if(!observation.isReliable(x)||!['working','warmup'].includes(observation.setClass(x)))continue;if(x?.measurementType==='duration'){const seconds=x.durationSeconds;if(!Number.isInteger(seconds)||seconds<=0||seconds>86400)continue;const load=9*clamp(seconds/45,.25,2)*(isWarmup(x)?.5:1);for(const [m,w] of factors(x,exercises))result[m]=(result[m]||0)+load*w;continue;}if(!observation.validRepetitions(x))continue;const reps=num(x.reps),kg=num(x.weight);const rir=observation.rir(x.rir).value;const effort=rir==null?1:({0:1.35,1:1.2,2:1.08,3:1,4:.88,5:.78}[rir]||1);const volume=kg*reps;const volFactor=kg===0?1:clamp(.8+.1*Math.log10(1+Math.max(0,volume)),.8,1.3);const repsFactor=clamp(reps/10,.75,1.2);const load=9*effort*volFactor*repsFactor*(isWarmup(x)?.5:1);for(const [m,w] of factors(x,exercises))result[m]=(result[m]||0)+load*w;}return result;}
function sessionImpulse(session,exercises){const rows=arr(session?.sets);const ids=new Set(arr(exercises).map(ex=>String(ex?.id)));const complete=rows.length>0&&rows.every(row=>row&&(ids.has(String(row.exerciseId))||Object.hasOwn(SPECIFIC,String(row.exerciseId)))&&(row.measurementType==='duration'?Number.isInteger(row.durationSeconds)&&row.durationSeconds>0&&row.durationSeconds<=86400:observation.validRepetitions(row)));if(complete||canRecomputeMapping(session,exercises))return impulse(session,exercises);return (session?.fatigueModel===3||session?.fatigueModel===2&&!arr(session?.sets).some(s=>s?.measurementType==='duration'))&&session?.fatigueImpulse&&typeof session.fatigueImpulse==='object'?session.fatigueImpulse:impulse(session,exercises);}
function fatigue(sessions,exercises,now=Date.now()){const totals={};for(const s of arr(sessions)){const time=Date.parse(s?.date||'');if(!Number.isFinite(time)||time>now)continue;const hours=(now-time)/3600000;for(const [muscle,raw] of Object.entries(sessionImpulse(s,exercises))){const n=num(raw);if(n<=0)continue;totals[muscle]=(totals[muscle]||0)+n*Math.pow(.5,hours/(HALF_LIFE[muscle]||48));}}return Object.fromEntries(Object.entries(totals).map(([m,v])=>[m,clamp(Math.round(v),0,100)]));}
function planMuscles(plan,exercises){const out={};for(const id of arr(plan?.exerciseIds)){const ex=arr(exercises).find(e=>String(e.id)===String(id));if(!ex)continue;for(const [m,w] of profile(ex))out[m]=(out[m]||0)+w;}const max=Math.max(0,...Object.values(out));return max?Object.fromEntries(Object.entries(out).map(([m,v])=>[m,v/max])):null;}
return Object.freeze({GROUPS,SPECIFIC,HALF_LIFE,profile,factors,normalizeCatalog,canRecomputeMapping,muscleLoads,sessionMuscles,impulse,sessionImpulse,fatigue,planMuscles,isWarmup});
});
