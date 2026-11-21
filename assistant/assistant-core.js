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
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const number=x=>finite(Number(x))?Number(x):0;
const validTime=x=>{if(typeof x!=='string'||!x.trim())return null;const t=Date.parse(x);return Number.isFinite(t)?t:null};
const arr=x=>Array.isArray(x)?x:[];
const shared=()=>typeof MuscleFatigueCore!=='undefined'?MuscleFatigueCore:(typeof module==='object'&&module.exports&&typeof require==='function'?require('../muscle-fatigue-core.js'):globalThis.MuscleFatigueCore);
const planMuscles=(plan,exercises)=>shared().planMuscles(plan,exercises);
const sessionImpulse=(s,exercises)=>shared().sessionImpulse(s,exercises);
const fatigueByMuscle=(sessions,exercises,now)=>shared().fatigue(sessions,exercises,now);
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