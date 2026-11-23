/* Moja Silownia: read-only progress analytics 2.0. No state mutations. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProgressCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const finite=v=>v!==null&&v!==''&&Number.isFinite(Number(v));
const number=v=>finite(v)?Number(v):NaN;
const time=s=>{const d=Date.parse(s?.date||'');return Number.isFinite(d)?d:NaN};
const validSet=s=>s&&typeof s.exerciseId==='string'&&finite(s.weight)&&finite(s.reps)&&number(s.weight)>=0&&Number.isInteger(number(s.reps))&&number(s.reps)>0;
const clean=sessions=>(Array.isArray(sessions)?sessions:[]).filter(s=>s&&Array.isArray(s.sets)&&Number.isFinite(time(s))).slice().sort((a,b)=>time(a)-time(b));
const setsFor=(session,id)=>(session.sets||[]).filter(s=>validSet(s)&&s.exerciseId===id);
const working=s=>s?.setType!=='R'&&s?.type!=='warmup';
const volume=sets=>sets.reduce((v,s)=>v+number(s.weight)*number(s.reps),0);
const sessionMode=typeof globalThis!=='undefined'&&globalThis.MojaSessionMode?globalThis.MojaSessionMode:(typeof module==='object'&&module.exports&&typeof require==='function'?require('./assistant/session-mode.js'):null);
const isRecovery=session=>sessionMode?sessionMode.isRecovery(session):session?.sessionMode==='recovery';
const rirStatus=set=>{
  if(set?.rir===null||set?.rir===undefined||set?.rir==='')return 'missing';
  return finite(set.rir)&&Number.isInteger(number(set.rir))&&number(set.rir)>=0&&number(set.rir)<=5?'valid':'invalid';
};
function estimateDetails(set){
  if(!validSet(set)||!working(set)||number(set.weight)<=0)return {value:null,quality:'unavailable'};
  const status=rirStatus(set);
  if(status==='invalid')return {value:null,quality:'invalid_rir'};
  const effective=number(set.reps)+(status==='valid'?number(set.rir):0);
  if(effective<1||effective>12)return {value:null,quality:'out_of_range'};
  return {value:number(set.weight)*(1+effective/30),quality:status==='valid'?'comparable':'indicative'};
}
const estimatedRM=set=>estimateDetails(set).value;
function records(sessions,id){const all=clean(sessions).filter(s=>!isRecovery(s)).flatMap(s=>setsFor(s,id).filter(working).map(x=>({...x,date:s.date})));const result={};for(const reps of [5,8,10,12,15]){const exact=all.filter(s=>number(s.reps)===reps).sort((a,b)=>number(b.weight)-number(a.weight))[0]||null;const atLeast=all.filter(s=>number(s.reps)>=reps).sort((a,b)=>number(b.weight)-number(a.weight))[0]||null;result[reps]={exact,atLeast};}return result;}
function exerciseSessions(sessions,id){return clean(sessions).map(s=>{const sets=setsFor(s,id);if(!sets.length)return null;const work=sets.filter(working);const details=work.map(estimateDetails);const rms=details.map(x=>x.value).filter(x=>x!==null);const reliable=details.filter(x=>x.quality==='comparable').map(x=>x.value);return {date:s.date,timestamp:time(s),sessionMode:isRecovery(s)?'recovery':'standard',sets:sets.map(x=>({...x})),max:work.length?Math.max(...work.map(x=>number(x.weight))):null,volume:volume(sets),oneRM:rms.length?Math.max(...rms):null,comparableOneRM:!isRecovery(s)&&reliable.length?Math.max(...reliable):null};}).filter(Boolean);}
function bodyweightSummary(sessions,id){
  const rows=exerciseSessions(sessions,id).map(session=>{
    const reps=session.sets.filter(working).map(set=>number(set.reps));
    return {date:session.date,timestamp:session.timestamp,sessionMode:session.sessionMode,
      sets:reps.length,totalReps:reps.reduce((sum,reps)=>sum+reps,0),
      bestReps:reps.length?Math.max(...reps):null};
  }).filter(row=>row.sets>0);
  const standard=rows.filter(row=>row.sessionMode!=='recovery');
  const best=standard.length?Math.max(...standard.map(row=>row.bestReps)):null;
  return {sessions:rows,bestReps:best,lastStandard:standard.at(-1)||null};
}
function trainingBreaks(sessions,options={}){
  const minDays=Number.isInteger(options.minDays)&&options.minDays>=2?options.minDays:14;
  const rows=clean(sessions).filter(session=>!isRecovery(session));
  const result=[];
  for(let i=1;i<rows.length;i++){
    const elapsed=(time(rows[i])-time(rows[i-1]))/86400000;
    if(elapsed>=minDays)result.push({from:rows[i-1].date,to:rows[i].date,
      elapsedDays:Math.floor(elapsed),restDays:Math.max(0,Math.ceil(elapsed)-1)});
  }
  return result;
}
function compare(sessions,id){const rows=exerciseSessions(sessions,id);if(rows.length<2)return null;const previous=rows[rows.length-2],latest=rows[rows.length-1];const delta={};for(const k of ['max','volume','oneRM']){delta[k]=previous[k]===null||latest[k]===null?null:{absolute:latest[k]-previous[k],percent:previous[k]>0?(latest[k]-previous[k])/previous[k]*100:null};}return {previous,latest,delta};}
function median(a){const s=a.slice().sort((a,b)=>a-b),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2;}
function trend(sessions,id){const values=exerciseSessions(sessions,id).map(r=>r.comparableOneRM).filter(v=>v!==null).slice(-6);if(values.length<4)return {kind:'insufficient',count:values.length,percent:null};const half=Math.floor(values.length/2),a=median(values.slice(0,half)),b=median(values.slice(half));const percent=a>0?(b-a)/a*100:null;return {kind:percent===null?'insufficient':percent>3?'up':percent< -3?'down':'stable',count:values.length,percent};}
function monthReport(sessions,year,month){const items=clean(sessions).filter(s=>{const d=new Date(time(s));return d.getFullYear()===year&&d.getMonth()+1===month;});const all=items.flatMap(s=>s.sets.filter(validSet));const byExercise=[...new Set(all.map(s=>s.exerciseId))];const before=clean(sessions).filter(s=>!isRecovery(s)&&time(s)<new Date(year,month-1,1).getTime());let prs=0;for(const id of byExercise){let highest=Math.max(0,...before.flatMap(s=>setsFor(s,id).filter(working).map(x=>number(x.weight))));for(const s of items.filter(s=>!isRecovery(s))){for(const x of setsFor(s,id).filter(working)){if(number(x.weight)>highest){prs++;highest=number(x.weight);}}}}return {year,month,count:items.length,sets:all.length,volume:volume(all),durationSeconds:items.reduce((sum,s)=>sum+(finite(s.durationSeconds)?Math.max(0,number(s.durationSeconds)):0),0),prs,exercises:byExercise.length};}
function inPeriod(sessions,days,now=Date.now()){return clean(sessions).filter(s=>!days||time(s)>=now-days*86400000);}
return Object.freeze({clean,validSet,working,volume,rirStatus,estimateDetails,estimatedRM,isRecovery,records,exerciseSessions,bodyweightSummary,trainingBreaks,compare,trend,monthReport,inPeriod});
});
