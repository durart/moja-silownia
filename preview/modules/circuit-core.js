/* Deterministic circuit runner, no browser or storage dependency. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MojaCircuitCore=api;})(globalThis,function factory(){
 'use strict';
 const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
 function build(blocks, count, blockRest=75){
  if(!Array.isArray(blocks)||!integer(count,1,blocks.length)||!integer(blockRest,0,3600))throw Error('Nieprawidłowy zakres programu');
  const steps=[];
  for(const [b,block] of blocks.slice(0,count).entries()){
   if(!integer(block.rounds,1,20)||!integer(block.rest,0,3600)||!Array.isArray(block.moves)||!block.moves.length||block.moves.length>50)throw Error('Nieprawidłowy blok');
   for(let r=1;r<=block.rounds;r++){
    for(const [i,m] of block.moves.entries()){
     if(!m||typeof m.name!=='string'||!['reps','duration'].includes(m.type)||!integer(m.target,1,3600))throw Error('Nieprawidłowe ćwiczenie');
     const sides=m.type==='duration'&&m.perSide?['lewa','prawa']:[null];
     for(const side of sides)steps.push({...m,side,kind:'exercise',block:b+1,round:r,rounds:block.rounds,number:i+1});
     if(i<block.moves.length-1&&integer(m.restAfter,1,3600))steps.push({kind:'rest',target:m.restAfter,block:b+1,round:r,reason:'exercise'});
    }
    if(r<block.rounds&&block.rest>0)steps.push({kind:'rest',target:block.rest,block:b+1,round:r,reason:'round'});
   }
   if(b<count-1&&blockRest>0)steps.push({kind:'rest',target:blockRest,block:b+1,round:block.rounds,reason:'block'});
  }
  return steps;
 }
 function create(steps,now){
  if(!Array.isArray(steps)||!steps.length||steps.length>2000||steps[0].kind!=='exercise'||!integer(now,0,Number.MAX_SAFE_INTEGER))throw Error('Nieprawidłowy trening');
  return {version:1,steps,position:0,status:'ready',deadline:null,remainingMs:null,records:[],startedAt:now};
 }
 function valid(run){
  if(!run||run.version!==1||!Array.isArray(run.steps)||!run.steps.length||run.steps.length>2000||!integer(run.position,0,run.steps.length)||!Array.isArray(run.records)||run.records.length>run.steps.length||!['ready','running','paused','rest','done'].includes(run.status)||!integer(run.startedAt,0,Number.MAX_SAFE_INTEGER))return false;
  if(!run.steps.every(x=>x&&integer(x.target,1,3600)&&(x.kind==='rest'||(x.kind==='exercise'&&typeof x.name==='string'&&['reps','duration'].includes(x.type)))))return false;
  if(!run.records.every(x=>x&&integer(x.position,0,run.steps.length-1)&&integer(x.actual,1,3600)&&run.steps[x.position]?.kind==='exercise'&&validAlternative(run.steps[x.position],x)))return false;
  if(new Set(run.records.map(x=>x.position)).size!==run.records.length||run.records.some(x=>x.position>=run.position))return false;
  if(run.status==='done')return run.position===run.steps.length&&run.deadline===null;
  if(run.position>=run.steps.length)return false;
  const step=run.steps[run.position];
  if(run.status==='ready')return step.kind==='exercise'&&run.deadline===null;
  if(run.status==='paused')return step.kind==='exercise'&&step.type==='duration'&&run.deadline===null&&integer(run.remainingMs,1,step.target*1000);
  return integer(run.deadline,0,Number.MAX_SAFE_INTEGER)&&(run.status==='rest'?step.kind==='rest':step.kind==='exercise'&&step.type==='duration');
 }
 function remaining(run,now){
  if(run.status==='paused')return Math.ceil(run.remainingMs/1000);
  if(run.status==='running'||run.status==='rest')return Math.max(0,Math.ceil((run.deadline-now)/1000));
  return run.steps[run.position]?.target||0;
 }
 function actualStep(step,record){return record?.alternative===true&&step?.alternative?{...step,...step.alternative}:step;}
 function validAlternative(step,record){return record?.alternative===undefined||(record.alternative===true&&step?.type==='reps'&&!!step.alternative);}
 function next(run,at,actual,alternative=false){
  const step=run.steps[run.position];
  const records=step.kind==='exercise'?[...run.records,{position:run.position,actual,completedAt:at,...(alternative?{alternative:true}:{})}]:run.records;
  const position=run.position+1,following=run.steps[position];
  if(!following)return {...run,position,records,status:'done',deadline:null,remainingMs:null,finishedAt:at};
  return {...run,position,records,status:following.kind==='rest'?'rest':'ready',deadline:following.kind==='rest'?at+following.target*1000:null,remainingMs:null};
 }
 function tick(run,now){
  let out=run;
  if(out.status==='running'&&now>=out.deadline)out=next(out,out.deadline,out.steps[out.position].target);
  if(out.status==='rest'&&now>=out.deadline)out=next(out,out.deadline);
  return out;
 }
 function act(run,event,now){
  if(!valid(run)||!integer(now,0,Number.MAX_SAFE_INTEGER))throw Error('Nieprawidłowy zapis treningu');
  const r=tick(run,now),s=r.steps[r.position]; 
  // An expired timer cannot also consume an action intended for the previous exercise.
  if(r!==run||!s)return r;
  switch(event.type){
   case 'start': return r.status==='ready'&&s.type==='duration'?{...r,status:'running',deadline:now+s.target*1000}:r;
   case 'pause': return r.status==='running'?{...r,status:'paused',remainingMs:Math.max(1,r.deadline-now),deadline:null}:r;
   case 'resume': return r.status==='paused'?{...r,status:'running',deadline:now+r.remainingMs,remainingMs:null}:r;
   case 'finish':{
    if(!['running','paused'].includes(r.status))return r;
    const left=r.status==='paused'?r.remainingMs:r.deadline-now;
    const actual=Math.floor((s.target*1000-left)/1000);
    return actual>=1?next(r,now,Math.min(s.target,actual)):r;
   }
   case 'reps':return r.status==='ready'&&s.type==='reps'&&integer(event.actual,1,3600)&&validAlternative(s,event)?next(r,now,event.actual,event.alternative===true):r;
   case 'manual':return r.status==='ready'&&s.type==='duration'&&integer(event.actual,1,3600)?next(r,now,event.actual):r;
   case 'skipRest':return r.status==='rest'?next(r,now):r;
   case 'tick':return r;
   default:return r;
  }
 }
 return Object.freeze({build,create,valid,remaining,act,actualStep,validAlternative});
});
