/* Read-only progression advice based on completed working sets of one exercise. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MojaAdvisorProgression=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const numeric=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
const isWarmup=row=>row?.setType==='R'||row?.type==='warmup'||row?.type==='R';
const flagNeedsReview=flag=>['pain','equipment','technique'].includes(flag);
function workingSets(session,exerciseId){
 return (Array.isArray(session?.sets)?session.sets:[])
  .filter(row=>row&&String(row.exerciseId)===String(exerciseId)&&!isWarmup(row)
   &&numeric(row.weight)&&Number(row.weight)>=0&&numeric(row.reps)&&Number.isInteger(Number(row.reps))&&Number(row.reps)>0)
  .map(row=>({weight:Number(row.weight),reps:Number(row.reps),
   rir:numeric(row.rir)&&Number(row.rir)>=0?Number(row.rir):null}));
}
function mainLoad(rows){
 const grouped=new Map();
 for(const row of rows){
  if(!grouped.has(row.weight))grouped.set(row.weight,[]);
  grouped.get(row.weight).push(row);
 }
 const sorted=[...grouped.entries()].sort((a,b)=>b[1].length-a[1].length||b[0]-a[0]);
 return {weight:sorted[0][0],rows:sorted[0][1]};
}
function suggest(sessions,exerciseId,options={}){
 const low=numeric(options.minReps)?Number(options.minReps):8;
 const high=numeric(options.maxReps)?Number(options.maxReps):12;
 if(!Number.isInteger(low)||!Number.isInteger(high)||low<1||high<low)
  return {action:'insufficient_data',reason:'Nieprawidłowy zakres powtórzeń.'};
 const history=(Array.isArray(sessions)?sessions:[])
  .filter(session=>session&&typeof session.date==='string'&&Number.isFinite(Date.parse(session.date)))
  .map(session=>({session,rows:workingSets(session,exerciseId)}))
  .filter(item=>item.rows.length)
  .sort((a,b)=>Date.parse(b.session.date)-Date.parse(a.session.date));
 if(!history.length)return {action:'insufficient_data',reason:'Brak zakończonych serii roboczych tego ćwiczenia w historii aplikacji.'};
 const latest=history[0],primary=mainLoad(latest.rows);
 const top=latest.rows.reduce((best,row)=>row.weight>best.weight?row:row.weight===best.weight&&row.reps>best.reps?row:best);
 const weight=primary.weight;
 const bestWeight=Math.max(...history.flatMap(item=>item.rows.map(row=>row.weight)));
 const base={weight,lastWeight:weight,lastTopWeight:top.weight,lastTopReps:top.reps,
  bestWeight,sessionCount:history.length,lastDate:latest.session.date};
 const result=(action,reason,extra={})=>({action,reason,...base,...extra});
 if(weight===0)return result('maintain','Ćwiczenie bez dodatkowego ciężaru. Porównuj powtórzenia i RIR, zamiast dodawać kilogramy.');
 if(history.slice(0,5).some(({session})=>flagNeedsReview(session.exerciseNotes?.[exerciseId]?.flag)))
  return result('review','W ostatnich treningach oznaczono ból, zmianę sprzętu lub problem z techniką. Sprawdź wykonanie przed zwiększeniem obciążenia.');
 if(primary.rows.some(row=>row.reps<low))
  return result('review','Seria robocza z dominującym ciężarem nie osiągnęła dolnego zakresu powtórzeń. Sprawdź technikę, przerwy i zmęczenie.');
 if(primary.rows.length<2)
  return result('maintain','Ostatni trening zawiera mniej niż dwie serie z tym samym ciężarem roboczym. Pokazuję obciążenie z historii, ale nie sugeruję jeszcze zwiększenia.');
 if(history.length<3)
  return result('maintain','Historia obejmuje mniej niż trzy treningi tego ćwiczenia. Zbieraj kolejne wyniki; ciężary z poprzednich serii nie są pomijane.');
 const recent=history.slice(0,3).map(({rows})=>mainLoad(rows));
 if(!recent.every(load=>load.weight===weight&&load.rows.length>=2))
  return result('maintain','Ostatnie trzy treningi różnią się ciężarem roboczym lub liczbą porównywalnych serii. Obecny ciężar pozostaje punktem odniesienia.');
 if(recent.some(load=>load.rows.some(row=>row.rir===null)))
  return result('maintain','Brakuje części ocen RIR w trzech ostatnich treningach. Historia ciężarów jest zachowana, ale nie potwierdza bezpiecznej progresji.');
 if(recent.every(load=>load.rows.every(row=>row.reps>=high&&row.rir>=2)))
  return result('consider_increase','W trzech ostatnich treningach co najmniej dwie serie na obecnym ciężarze osiągnęły górny zakres przy RIR ≥ 2. Możesz rozważyć +2,5 kg.',{suggestedWeight:Math.round((weight+2.5)*2)/2});
 return result('maintain','Kontynuuj progresję powtórzeń przy obecnym ciężarze. Zwiększaj obciążenie po stabilnych wynikach z odpowiednią rezerwą RIR.');
}
return Object.freeze({suggest});
});
