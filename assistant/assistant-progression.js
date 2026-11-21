/* Read-only double-progression suggestion for a single exercise. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.MojaAdvisorProgression=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const valid=x=>typeof x==='number'&&Number.isFinite(x);
function suggest(sessions,exerciseId,options={}){
 const low=valid(options.minReps)?options.minReps:8,high=valid(options.maxReps)?options.maxReps:12;
 if(low<1||high<low)return {action:'insufficient_data',reason:'Nieprawidłowy zakres powtórzeń.'};
 const candidates=(Array.isArray(sessions)?sessions:[]).filter(s=>s&&typeof s.date==='string'&&Number.isFinite(Date.parse(s.date))).slice().sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
 const recent=candidates.map(s=>(Array.isArray(s.sets)?s.sets:[]).filter(x=>String(x.exerciseId)===String(exerciseId)&&valid(Number(x.weight))&&valid(Number(x.reps))&&Number(x.reps)>0)).filter(a=>a.length);
 if(!recent.length)return {action:'insufficient_data',reason:'Brak serii tego ćwiczenia w historii.'};
 const last=recent[0],weight=Number(last[0].weight);
 if(last.length<2||last.some(x=>Number(x.weight)!==weight))return {action:'maintain',weight,reason:'Zbyt mało porównywalnych serii, by sugerować progresję.'};
 if(weight<=0)return {action:'maintain',weight,reason:'Ćwiczenie z masą ciała — nie sugeruję automatycznej zmiany obciążenia.'};
 const rirKnown=last.every(x=>x.rir!=null&&valid(Number(x.rir)));
 if(!rirKnown)return {action:'maintain',weight,reason:'Brak pełnych danych RIR — zachowaj ciężar i oceń technikę.'};
 if(last.every(x=>Number(x.reps)>=high&&Number(x.rir)>=2))return {action:'consider_increase',weight,reason:'Wszystkie ostatnie serie osiągnęły górny zakres powtórzeń przy RIR co najmniej 2. Zwiększenie ciężaru wymaga Twojej decyzji.'};
 if(last.some(x=>Number(x.reps)<low))return {action:'review',weight,reason:'Co najmniej jedna seria poniżej dolnego zakresu. Sprawdź przerwy, technikę i zmęczenie.'};
 return {action:'maintain',weight,reason:'Kontynuuj progresję powtórzeń przy obecnym ciężarze.'};
}
return Object.freeze({suggest});
});