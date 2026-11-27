/* Pure, read-only aggregates for Cyan Dashboard v2. No storage or DOM access. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.DashboardCyanCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const validDate=x=>{const t=Date.parse(x);return Number.isFinite(t)?t:null};
function weekStart(date){const d=new Date(date);d.setHours(0,0,0,0);d.setDate(d.getDate()-(d.getDay()+6)%7);return d.getTime();}
function sessionVolume(s){return (s?.sets||[]).reduce((v,x)=>v+(x.measurementType==='duration'?0:Math.max(0,num(x.weight))*Math.max(0,num(x.reps))),0);}
function snapshot(state,now=new Date(),goal=3){
 const sessions=Array.isArray(state?.sessions)?state.sessions:[];
 const sorted=sessions.filter(s=>validDate(s?.date)!==null).slice().sort((a,b)=>validDate(b.date)-validDate(a.date));
 const start=weekStart(now),end=start+7*86400000;
 const weekly=sorted.filter(s=>{const t=validDate(s.date);return t>=start&&t<end;});
 const weeks=Array.from({length:4},(_,i)=>{const a=start-(3-i)*7*86400000,b=a+7*86400000,subset=sorted.filter(s=>{const t=validDate(s.date);return t>=a&&t<b;});return {start:a,count:subset.length,volume:subset.reduce((v,s)=>v+sessionVolume(s),0)};});
 const g=Math.max(1,Math.round(num(goal)||3));
 return {last:sorted[0]||null,week:{count:weekly.length,volume:weekly.reduce((v,s)=>v+sessionVolume(s),0),minutes:Math.round(weekly.reduce((v,s)=>v+Math.max(0,num(s.durationSeconds)),0)/60),goal:g,progress:Math.min(100,Math.round(weekly.length/g*100))},weeks};
}
return Object.freeze({weekStart,sessionVolume,snapshot});
});