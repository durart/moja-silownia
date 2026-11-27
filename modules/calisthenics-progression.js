/* Advisory-only progression based on completed program records. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MojaCalisthenicsProgression=api;})(globalThis,function(){
 'use strict';
 const integer=n=>Number.isSafeInteger(n)&&n>=1&&n<=3600;
 const validMove=m=>m&&typeof m.id==='string'&&['reps','duration'].includes(m.type)&&integer(m.target);
 // Match the exact movement and execution context; never compare a timed set with repetitions.
 function key(m){return JSON.stringify([m.id,m.type,!!m.perSide,m.side??null,m.pauseSeconds??0,m.pausePosition??null,m.block??1,String(m.note??'')]);}
 function collect(program,completed,core,history,now){
  const samples=new Map(),fallbacks=new Map();
  for(const d of Array.isArray(completed)?completed:[]){
   if(!Number.isSafeInteger(d?.day)||!Number.isSafeInteger(d.finishedAt)||d.finishedAt>now||!Number.isSafeInteger(d.blockCount)||d.blockCount<1)continue;
   const def=history.definitionFor(program,d.day,d.scheduleRevision);
   if(def?.kind!=='training'||d.blockCount>def.blocks.length||!Array.isArray(d.records))continue;
   const steps=core.build(def.blocks,d.blockCount,program.blockRest);
   const expected=steps.map((s,i)=>s.kind==='exercise'?i:null).filter(i=>i!==null);
   if(d.records.length!==expected.length||!d.records.every((r,i)=>r?.position===expected[i]&&integer(r.actual)&&core.validAlternative(steps[r.position],r)))continue;
   const local=new Map(),usedAlternatives=new Set();
   for(const r of d.records){
    const base=steps[r.position],m=core.actualStep(base,r);
    if(!validMove(m)||m.unresolved||m.phase)continue;
    const k=key(m),row=local.get(k)||{day:d.day,at:d.finishedAt,minimum:r.actual,count:0,met:true};
    row.minimum=Math.min(row.minimum,r.actual);row.count++;row.met=row.met&&r.actual>=m.target;local.set(k,row);
    if(r.alternative&&validMove(base))usedAlternatives.add(key(base));
   }
   for(const [k,row] of local){const list=samples.get(k)||[];list.push(row);samples.set(k,list);}
   for(const k of usedAlternatives){const list=fallbacks.get(k)||[];list.push({day:d.day,at:d.finishedAt});fallbacks.set(k,list);}
  }
  for(const map of [samples,fallbacks])for(const list of map.values())list.sort((a,b)=>b.at-a.at||b.day-a.day);
  return {samples,fallbacks};
 }
 function relevantFatigue(move,exercises,model,values){
  const ex=exercises.find(e=>e.id===move.id);
  if(!ex||!values||!model)return null;
  const ranked=model.profile(ex).filter(([m,w])=>m!=='Inne'&&w>=.5&&Number.isFinite(values[m])).map(([muscle])=>({muscle,value:values[muscle]})).sort((a,b)=>b.value-a.value);
  return ranked[0]??null;
 }
 function advise(move,index,fatigue=null){
  if(!validMove(move)||move.phase||move.unresolved)return null;
  const rows=(index.samples.get(key(move))||[]).slice(0,2);
  const last=rows[0]??null,high=!!fatigue&&fatigue.value>=65;
  const recentFallback=(index.fallbacks.get(key(move))||[])[0];
  const fallbackRecent=!!recentFallback&&(!last||recentFallback.at>=last.at);
  const repeated=rows.length===2&&rows.every(r=>!r.met);
  const lastBelow=!!last&&last.minimum<move.target;
  const result={status:'baseline',target:move.target,suggested:move.target,alternative:false,last,observations:rows.length,fatigue};
  if(high||repeated||fallbackRecent){
   result.status='caution';
   // An easier movement is suggested only when the program actually defines one.
   if(move.type==='reps'&&move.alternative&&(repeated||fallbackRecent)){result.alternative=true;result.suggested=move.alternative.target;}
   else if(lastBelow)result.suggested=last.minimum;
   else if(high)result.suggested=Math.max(1,Math.floor(move.target*.8));
   return result;
  }
  if(lastBelow){result.status='build';result.suggested=last.minimum;return result;}
  if(rows.length===2&&rows.every(r=>r.met&&r.minimum>=move.target)){result.status='ready';return result;}
  if(last)result.status='maintain';
  return result;
 }
 return Object.freeze({key,collect,relevantFatigue,advise});
});
