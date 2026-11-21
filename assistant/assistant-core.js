/* Moja Silownia: Active Advisor Stage 1.
 * Pure read-only recommendation engine; no DOM, storage, network, or side effects.
 * All thresholds are product heuristics, not clinical recovery measures.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MojaAdvisorCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const DEFAULTS=Object.freeze({rotation:30,load:30,recency:20,regularity:10,evidence:10});
const HALF_LIFE=Object.freeze({'Klatka piersiowa':48,'Plecy':48,'Nogi':60,'Barki':42,'Biceps':36,'Triceps':36,'Brzuch':36,'Łydki':40,'Przedramiona':36,'Inne':48});
const GROUPS=Object.freeze({'Klatka piersiowa':[['Klatka piersiowa',1],['Triceps',.45],['Barki',.45]],'Plecy':[['Plecy',1],['Biceps',.45]],'Barki':[['Barki',1],['Triceps',.3]],'Biceps':[['Biceps',1]],'Triceps':[['Triceps',1]],'Nogi':[['Nogi',1]],'Brzuch':[['Brzuch',1]],'Łydki':[['Łydki',1]],'Przedramiona':[['Przedramiona',1]],'Inne':[['Inne',1]]});
const SPECIFIC=Object.freeze({'seed-0':[['Klatka piersiowa',1],['Barki',.6],['Triceps',.5]],'seed-1':[['Klatka piersiowa',1],['Barki',.2]],'seed-2':[['Klatka piersiowa',1],['Triceps',.5],['Barki',.5]],'seed-3':[['Plecy',1],['Biceps',.55]],'seed-4':[['Plecy',1],['Biceps',.5]],'seed-5':[['Barki',1]],'seed-6':[['Biceps',1]],'seed-7':[['Biceps',1]],'seed-8':[['Triceps',1]],'seed-9':[['Nogi',1]],'seed-10':[['Nogi',1]],'seed-11':[['Nogi',1]],'seed-12':[['Nogi',1]],'seed-13':[['Klatka piersiowa',1],['Triceps',.5],['Barki',.5]],'seed-14':[['Brzuch',1]]});
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const number=x=>finite(Number(x))?Number(x):0;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const validTime=x=>{if(typeof x!=='string'||!x.trim())return null;const t=Date.parse(x);return Number.isFinite(t)?t:null};
const arr=x=>Array.isArray(x)?x:[];
const profile=(ex)=>SPECIFIC[String(ex?.id)]||GROUPS[ex?.group]||GROUPS.Inne;
const id=x=>String(x);
function planMuscles(plan,exercises){
 const byId=new Map(arr(exercises).filter(x=>x&&x.id!=null).map(x=>[id(x.id),x]));
 const result={};
 for(const eid of arr(plan?.exerciseIds)){const ex=byId.get(id(eid));if(!ex)continue;for(const [muscle,weight] of profile(ex))result[muscle]=(result[muscle]||0)+weight;}
 const max=Math.max(0,...Object.values(result));if(!max)return null;
 return Object.fromEntries(Object.entries(result).map(([k,v])=>[k,v/max]));
}
function sessionImpulse(s,exercises){
 if(s?.fatigueModel===2&&s?.fatigueImpulse&&typeof s.fatigueImpulse==='object')return s.fatigueImpulse;
 const byId=new Map(arr(exercises).filter(x=>x&&x.id!=null).map(x=>[id(x.id),x]));
 const result={};
 for(const x of arr(s?.sets)){
  const reps=number(x?.reps),kg=number(x?.weight);if(reps<=0)continue;
  const rir=x?.rir==null?null:number(x.rir);
  const effort=rir==null?1:({0:1.35,1:1.2,2:1.08,3:1,4:.88,5:.78}[clamp(rir,0,5)]||1);
  const vol=kg*reps;
  const volFactor=kg===0?1:clamp(.8+.1*Math.log10(1+Math.max(0,vol)),.8,1.3);
  const impulse=9*effort*volFactor*clamp(reps/10,.75,1.2);
  const ex=byId.get(id(x.exerciseId));
  for(const [muscle,weight] of profile(ex))result[muscle]=(result[muscle]||0)+impulse*weight;
 }
 return result;
}
function fatigueByMuscle(sessions,exercises,now){
 const total={};
 for(const s of arr(sessions)){
  const t=validTime(s?.date);if(t==null||t>now)continue;
  const hours=(now-t)/3600000;
  for(const [muscle,raw] of Object.entries(sessionImpulse(s,exercises))){
   const impulse=number(raw);if(impulse<=0)continue;
   total[muscle]=(total[muscle]||0)+impulse*Math.pow(.5,hours/(HALF_LIFE[muscle]||48));
  }
 }
 return Object.fromEntries(Object.entries(total).map(([k,v])=>[k,clamp(Math.round(v),0,100)]));
}
function weekStart(ms){const d=new Date(ms);d.setHours(0,0,0,0);d.setDate(d.getDate()-(d.getDay()+6)%7);return d.getTime();}
function evaluate(state,options={}){
 const now=finite(options.now)?options.now:Date.now();
 const plans=arr(state?.plans).filter(p=>p&&p.id!=null&&arr(p.exerciseIds).length);
 const sessions=arr(state?.sessions).filter(s=>{const t=validTime(s?.date);return t!=null&&t<=now}).slice().sort((a,b)=>validTime(b.date)-validTime(a.date));
 const running=Boolean(state?.startedAt&&(state?.manualStarted||state?.activePlan!=null||arr(state?.active).length));
 if(running)return {status:'in_progress',recommended:null,candidates:[],reasons:['Masz rozpoczęty trening. Wróć do niego zamiast rozpoczynać nowy.'],confidence:'high'};
 if(!plans.length)return {status:'no_plans',recommended:null,candidates:[],reasons:['Brak zapisanych planów. Możesz rozpocząć trening dowolny.'],confidence:'none'};
 const fatigue=fatigueByMuscle(sessions,state?.exercises,now);
 const goal=clamp(Math.round(number(options.weeklyGoal)||3),1,7);
 const weeklyCount=sessions.filter(s=>validTime(s.date)>=weekStart(now)).length;
 const candidate=plans.map(p=>{
  const matching=sessions.filter(s=>s.planName===p.name);
  const last=matching[0]||null,days=last?(now-validTime(last.date))/86400000:null;
  const rotation=sessions.length?(sessions[0].planName===p.name?0:1):.5;
  const muscles=planMuscles(p,state?.exercises);
  const load=muscles?Object.entries(muscles).reduce((a,[m,w])=>a+number(fatigue[m])*w,0)/Object.values(muscles).reduce((a,b)=>a+b,0):null;
  const loadScore=load==null?.5:1-clamp(load/100,0,1);
  const recency=days==null?.5:clamp(days/3,0,1);
  const regularity=weeklyCount<goal?1:.5;
  const evidence=clamp(matching.length/3,0,1);
  const score=Math.round(DEFAULTS.rotation*rotation+DEFAULTS.load*loadScore+DEFAULTS.recency*recency+DEFAULTS.regularity*regularity+DEFAULTS.evidence*evidence);
  const reasons=[];
  if(sessions.length)reasons.push(sessions[0].planName===p.name?'Ten plan był wykonywany ostatnio.':'Ostatnia sesja dotyczyła innego planu.');
  if(load!=null)reasons.push('Szacowane obciążenie mięśni tego planu: '+Math.round(load)+'/100.');
  if(days!=null)reasons.push('Od ostatniego wykonania planu minęło '+days.toFixed(1)+' dnia.');
  if(!matching.length)reasons.push('Brak wcześniejszej sesji tego planu — ograniczona pewność.');
  return {planId:p.id,planName:p.name,score,load:load==null?null:Math.round(load),lastPerformed:last?.date||null,historyCount:matching.length,reasons,confidence:matching.length>=3?'high':matching.length>=1?'medium':'low'};
 }).sort((a,b)=>b.score-a.score||String(a.planName).localeCompare(String(b.planName),'pl'));
 const recommended=candidate[0];
 return {status:'ready',recommended,candidates:candidate,reasons:recommended.reasons,confidence:recommended.confidence,warning:recommended.load>=65?'Model wskazuje duże obciążenie części mięśni. Rozważ lżejszy trening lub odpoczynek.':null};
}
return Object.freeze({evaluate,planMuscles,fatigueByMuscle,sessionImpulse,weekStart,DEFAULTS});
});