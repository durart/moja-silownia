/* Pure adapter from program records to the workout diary. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MojaProgramHistory=api;})(globalThis,function(){
 'use strict';
 function sessionKey(p,d){return p.id+':'+p.version+':'+d.day+':'+d.finishedAt;}
 function definitionFor(p,day,revision){if(!p)return undefined;const rev=revision??1;if(rev===1)return (p.legacyDays||p.days).find(x=>x.day===day);if(rev===p.scheduleRevision)return p.days.find(x=>x.day===day);return undefined;}
 function createSession(p,definition,d,core,id){
  const steps=core.build(definition.blocks,d.blockCount,p.blockRest);
  const sets=d.records.map(r=>{
   const s=core.actualStep(steps[r.position],r);
   if(s?.kind!=='exercise'||s.unresolved)throw Error('Nieprawidłowy wynik programu');
   const exerciseId=s.id||('program-only-'+s.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-'));
   const fields={exerciseId,name:s.name,weight:0,setType:'W',at:new Date(r.completedAt).toISOString(),pr:[],
     programSet:{block:s.block,round:s.round,number:s.number,side:s.side||null,perSide:!!s.perSide,target:s.target,...(s.pauseSeconds?{pauseSeconds:s.pauseSeconds,pausePosition:s.pausePosition}:{}),...(r.alternative?{alternative:true}:{}),...(s.sourceLabel?{sourceLabel:s.sourceLabel}:{})}};
   return s.type==='duration'?{...fields,measurementType:'duration',durationSeconds:r.actual,targetDurationSeconds:s.target}:{...fields,reps:r.actual};
  });
  const durationSeconds=Number.isSafeInteger(d.startedAt)&&d.startedAt<=d.finishedAt?Math.floor((d.finishedAt-d.startedAt)/1000):null;
  return {id,date:new Date(d.finishedAt).toISOString(),planName:p.title+' · Dzień '+d.day+' — '+definition.title,sets,durationSeconds,
    sessionMode:definition.kind==='recovery'?'recovery':'standard',preWorkout:null,exerciseNotes:{},
    program:{key:sessionKey(p,d),id:p.id,version:p.version,day:d.day,blockCount:d.blockCount,kind:definition.kind}};
 }
 function reconcile(v,sessions,programs,core,enrich=s=>s){
  let next=v,history=sessions,added=[],lastId=null;
  const used=new Set(sessions.map(s=>String(s.id)));
  for(const p of programs){
   const progress=v.progress[p.id];if(!progress)continue;
   for(const [index,d] of progress.completed.entries()){
    if(d.blockCount===0||d.historyId!=null)continue;
    const definition=definitionFor(p,d.day,d.scheduleRevision);
    if(!definition||definition.kind==='rest')throw Error('Nieprawidłowy dzień historii');
    const key=sessionKey(p,d),existing=history.find(s=>s.program?.key===key);
    let id=existing?.id;
    if(id==null){
     id=d.finishedAt;
     while(used.has(String(id)))id++;
     if(!Number.isSafeInteger(id))throw Error('Nieprawidłowy identyfikator treningu');
     const session=enrich(createSession(p,definition,d,core,id),d);
     if(history===sessions)history=[...sessions];
     const position=history.findIndex(s=>Date.parse(s.date)<Date.parse(session.date));
     history.splice(position<0?history.length:position,0,session);
     used.add(String(id));added.push(id);
    }
    if(next===v)next={...v,progress:{...v.progress}};
    if(next.progress[p.id]===progress)next.progress[p.id]={...progress,completed:[...progress.completed]};
    next.progress[p.id].completed[index]={...d,historyId:id};lastId=id;
   }
  }
  return {programTraining:next,sessions:history,added,lastId};
 }
 function resultLabel(step,actual){
  return actual==null?'—':actual+(step.type==='duration'?' s':' powt.')+(step.side?' · '+step.side+' strona':step.perSide&&step.type==='reps'?' / stronę':'');
 }
 return Object.freeze({createSession,reconcile,resultLabel,definitionFor});
});
