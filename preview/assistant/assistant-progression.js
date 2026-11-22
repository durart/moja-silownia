/* Read-only double-progression suggestion for a single exercise. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.MojaAdvisorProgression=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const valid=x=>typeof x==='number'&&Number.isFinite(x);
function suggest(sessions,exerciseId,options={}){
 const low=valid(options.minReps)?options.minReps:8,high=valid(options.maxReps)?options.maxReps:12;
 if(low<1||high<low)return {action:'insufficient_data',reason:'Nieprawidłowy zakres powtórzeń.'};
 const candidates=(Array.isArray(sessions)?sessions:[]).filter(s=>s&&typeof s.date==='string'&&Number.isFinite(Date.parse(s.date))).slice().sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
 const recent=candidates.map(s=>(Array.isArray(s.sets)?s.sets:[]).filter(x=>String(x.exerciseId)===String(exerciseId)&&valid(Number(x.weight))&&valid(Number(x.reps))&&Number(x.reps)>0&&x.setType!=='R'&&x.type!=='warmup')).filter(a=>a.length);
 if(!recent.length)return {action:'insufficient_data',reason:'Brak serii tego ćwiczenia w historii.'};
 const comparable=recent.slice(0,5);
 const last=comparable[0],weight=Number(last[0].weight);
 const notes=candidates.filter(session=>(session.sets||[]).some(set=>String(set.exerciseId)===String(exerciseId))).slice(0,5);
 const unsafe=notes.some(session=>['pain','equipment','technique'].includes(session.exerciseNotes?.[exerciseId]?.flag));
 if(last.length<2||last.some(x=>Number(x.weight)!==weight))return {action:'maintain',weight,reason:'Zbyt mało porównywalnych serii, by sugerować progresję.'};
 if(weight<=0)return {action:'maintain',weight,reason:'Ćwiczenie z masą ciała — zwiększaj liczbę powtórzeń, nie ciężar.'};
 if(unsafe)return {action:'review',weight,reason:'W ostatnich treningach oznaczono ból, zmianę sprzętu lub problem z techniką. Nie proponuję zwiększenia ciężaru.'};
 if(comparable.length<3)return {action:'maintain',weight,reason:'Potrzebne są co najmniej 3 treningi z tym ćwiczeniem do wiarygodnej sugestii.'};
 const consistent=comparable.slice(0,3).every(sets=>sets.length>=2&&sets.every(x=>Number(x.weight)===weight&&x.rir!=null&&valid(Number(x.rir))));
 if(!consistent)return {action:'maintain',weight,reason:'Brak 3 porównywalnych treningów z kompletnymi danymi RIR i tym samym ciężarem.'};
 const latestThree=comparable.slice(0,3);
 if(latestThree.every(sets=>sets.every(x=>Number(x.reps)>=high&&Number(x.rir)>=2)))
  return {action:'consider_increase',weight,suggestedWeight:Math.round((weight+2.5)*2)/2,reason:'W 3 ostatnich treningach wszystkie serie osiągnęły górny zakres przy RIR ≥ 2. Możesz rozważyć +2,5 kg.'};
 if(last.some(x=>Number(x.reps)<low))return {action:'review',weight,reason:'Co najmniej jedna seria poniżej dolnego zakresu. Sprawdź przerwy, technikę i zmęczenie.'};
 return {action:'maintain',weight,reason:'Kontynuuj progresję powtórzeń przy obecnym ciężarze.'};
}
return Object.freeze({suggest});
});