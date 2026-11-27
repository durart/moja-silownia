/* Optional, versioned preparation and cooldown stages. No DOM or storage dependency. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MojaProgramPreparation=api;})(globalThis,function(){
 'use strict';
 const move=(id,name,type,target,note='',extra={})=>Object.freeze({id,name,type,target,note,...extra});
 const march=move('cali-35','Marsz w miejscu','duration',30,'Unoś kolana w komfortowym zakresie, poruszaj ramionami.');
 const slowSquat=n=>move('cali-12','Wolne przysiady z masą ciała','reps',n,'Zacznij płytko, stopniowo zwiększaj głębokość bez bólu.');
 const twist=move('cali-55','Skręty tułowia na stojąco','reps',10,'Łącznie w obie strony. Ręce rozluźnione.');
 const routines=Object.freeze({
  express:Object.freeze([march,move('cali-53','Krążenia ramion','duration',30,'10 s małe krążenia w przód, 10 s większe w przód, 10 s w tył.'),slowSquat(5),twist]),
  standard:Object.freeze([march,move('cali-53','Krążenia ramion','reps',20,'10 małych krążeń w przód i 10 w tył.'),move('cali-54','Krążenia barków','reps',20,'10 w tył, następnie 10 w przód.'),twist,move('cali-56','Krążenia bioder','reps',20,'10 w każdą stronę.'),move('cali-57','Wymachy nóg','reps',10,'Przód i tył, z podparciem.',{perSide:true}),slowSquat(8),move('cali-39','Inchworm','reps',3,'W pozycji deski zatrzymaj się na jeden oddech.'),move('cali-58','Przyciąganie kolana do klatki piersiowej w staniu','reps',5,'Przytrzymaj delikatnie przez sekundę.',{perSide:true})]),
  cooldown:Object.freeze([move('cali-35','Powolny marsz w miejscu','duration',30,'Rozluźnij ramiona i uspokój oddech.'),move('cali-59','Skłon w przód w staniu','duration',20,'W razie potrzeby ugnij kolana.'),move('cali-60','Rozciąganie czworogłowego uda w staniu','duration',20,'Z podparciem, kolana blisko siebie.',{perSide:true}),move('cali-61','Rozciąganie typu „czwórka”','duration',20,'Kostka na przeciwległym kolanie, przyciągaj udo nogi podporowej.',{perSide:true}),move('cali-62','Otwieranie klatki piersiowej przy ścianie','duration',20,'Delikatnie obróć tułów od ściany.',{perSide:true}),move('cali-63','Rotacja tułowia w leżeniu','duration',20,'Nie wymuszaj skrętu; barki pozostają rozluźnione.',{perSide:true}),move('cali-64','Głębokie oddechy','reps',5,'Wdech nosem, wydech ustami; spokojnie.',{unit:'breaths'})])
 });
 function normalize(value){
  if(value==null)return null;
  if(value.version!==1||!['none','express','standard'].includes(value.warmup)||typeof value.cooldown!=='boolean')throw Error('Nieprawidłowa rozgrzewka lub schładzanie');
  return {version:1,warmup:value.warmup,cooldown:value.cooldown};
 }
 function phaseSteps(core,moves,phase){return core.build([{rounds:1,rest:0,moves}],1,0).map(s=>({...s,phase}));}
 function layout(core,blocks,count,blockRest,selection){
  const cfg=normalize(selection),main=core.build(blocks,count,blockRest);
  const warm=cfg&&cfg.warmup!=='none'?phaseSteps(core,routines[cfg.warmup],'warmup'):[];
  const cool=cfg?.cooldown?phaseSteps(core,routines.cooldown,'cooldown'):[];
  return {steps:[...warm,...main,...cool],mainOffset:warm.length,mainLength:main.length};
 }
 function split(layout,records){
  const end=layout.mainOffset+layout.mainLength,main=[],aux=[];
  for(const record of records){
   if(record.position>=layout.mainOffset&&record.position<end)main.push({...record,position:record.position-layout.mainOffset});
   else aux.push({...record});
  }
  return {main,aux};
 }
 function review(layout,main,aux=[]){return [...main.map(r=>({...r,position:r.position+layout.mainOffset})),...aux].sort((a,b)=>a.position-b.position);}
 function validateAuxiliary(layout,records,core){
  if(!Array.isArray(records)||records.length>layout.steps.length)return false;
  const seen=new Set();
  return records.every(r=>{
   const step=layout.steps[r?.position];
   if(!step?.phase||step.kind!=='exercise'||!Number.isSafeInteger(r.actual)||r.actual<1||r.actual>3600||!Number.isSafeInteger(r.completedAt)||r.completedAt<0||!core.validAlternative(step,r)||seen.has(r.position))return false;
   seen.add(r.position);return true;
  });
 }
 function skipPhase(run,now){
  const phase=run.steps[run.position]?.phase;
  if(!phase||!Number.isSafeInteger(now)||now<run.startedAt)return run;
  let position=run.position;
  while(run.steps[position]?.phase===phase)position++;
  const done=position===run.steps.length;
  return {...run,position,status:done?'done':'ready',deadline:null,remainingMs:null,...(done?{finishedAt:now}:{})};
 }
 return Object.freeze({routines,normalize,layout,split,review,validateAuxiliary,skipPhase});
});
