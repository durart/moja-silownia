/* Moja Silownia: read-only progress analytics 2.0. No state mutations. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProgressCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const finite=v=>v!==null&&v!==''&&Number.isFinite(Number(v));
const number=v=>finite(v)?Number(v):NaN;
const time=s=>{const d=Date.parse(s?.date||'');return Number.isFinite(d)?d:NaN};
const validSet=s=>s&&typeof s.exerciseId==='string'&&finite(s.weight)&&finite(s.reps)&&number(s.weight)>=0&&Number.isInteger(number(s.reps))&&number(s.reps)>0;
const clean=sessions=>(Array.isArray(sessions)?sessions:[]).filter(s=>s&&Array.isArray(s.sets)&&Number.isFinite(time(s))).slice().sort((a,b)=>time(a)-time(b));
const setsFor=(session,id)=>(session.sets||[]).filter(s=>validSet(s)&&s.exerciseId===id);
const volume=sets=>sets.reduce((v,s)=>v+number(s.weight)*number(s.reps),0);
const estimatedRM=s=>validSet(s)&&number(s.weight)>0&&number(s.reps)<=12?number(s.weight)*(1+number(s.reps)/30):null;
function records(sessions,id){const all=clean(sessions).flatMap(s=>setsFor(s,id).map(x=>({...x,date:s.date})));const result={};for(const reps of [5,8,10,12,15]){const exact=all.filter(s=>number(s.reps)===reps).sort((a,b)=>number(b.weight)-number(a.weight))[0]||null;const atLeast=all.filter(s=>number(s.reps)>=reps).sort((a,b)=>number(b.weight)-number(a.weight))[0]||null;result[reps]={exact,atLeast};}return result;}
function exerciseSessions(sessions,id){return clean(sessions).map(s=>{const sets=setsFor(s,id);if(!sets.length)return null;const rms=sets.map(estimatedRM).filter(x=>x!==null);return {date:s.date,timestamp:time(s),sets:sets.map(x=>({...x})),max:Math.max(...sets.map(x=>number(x.weight))),volume:volume(sets),oneRM:rms.length?Math.max(...rms):null};}).filter(Boolean);}
function compare(sessions,id){const rows=exerciseSessions(sessions,id);if(rows.length<2)return null;const previous=rows[rows.length-2],latest=rows[rows.length-1];const delta={};for(const k of ['max','volume','oneRM']){delta[k]=previous[k]===null||latest[k]===null?null:{absolute:latest[k]-previous[k],percent:previous[k]>0?(latest[k]-previous[k])/previous[k]*100:null};}return {previous,latest,delta};}
function median(a){const s=a.slice().sort((a,b)=>a-b),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2;}
function trend(sessions,id){const values=exerciseSessions(sessions,id).map(r=>r.oneRM).filter(v=>v!==null).slice(-6);if(values.length<4)return {kind:'insufficient',count:values.length,percent:null};const half=Math.floor(values.length/2),a=median(values.slice(0,half)),b=median(values.slice(half));const percent=a>0?(b-a)/a*100:null;return {kind:percent===null?'insufficient':percent>3?'up':percent< -3?'down':'stable',count:values.length,percent};}
function monthReport(sessions,year,month){const items=clean(sessions).filter(s=>{const d=new Date(time(s));return d.getFullYear()===year&&d.getMonth()+1===month;});const all=items.flatMap(s=>s.sets.filter(validSet));const byExercise=[...new Set(all.map(s=>s.exerciseId))];const before=clean(sessions).filter(s=>time(s)<new Date(year,month-1,1).getTime());let prs=0;for(const id of byExercise){let highest=Math.max(0,...before.flatMap(s=>setsFor(s,id).map(x=>number(x.weight))));for(const s of items){for(const x of setsFor(s,id)){if(number(x.weight)>highest){prs++;highest=number(x.weight);}}}}return {year,month,count:items.length,sets:all.length,volume:volume(all),durationSeconds:items.reduce((sum,s)=>sum+(finite(s.durationSeconds)?Math.max(0,number(s.durationSeconds)):0),0),prs,exercises:byExercise.length};}
function inPeriod(sessions,days,now=Date.now()){return clean(sessions).filter(s=>!days||time(s)>=now-days*86400000);}
return Object.freeze({clean,validSet,volume,estimatedRM,records,exerciseSessions,compare,trend,monthReport,inPeriod});
});
