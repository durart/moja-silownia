/* Shared, read-only gate for current conditions and comparable training history. */
(function(root,factory){
 const observation=typeof module==='object'&&module.exports?require('../modules/set-observation.js'):root.MojaSetObservation;
 const api=factory(observation);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MojaRecommendationSafety=api;
})(globalThis,function(observation){
 'use strict';
 const flagNeedsReview=flag=>['pain','equipment','technique'].includes(flag);
 function readinessCaution(pre){
  const sleep=observation.number(pre?.sleepHours),battery=observation.number(pre?.battery),score=observation.number(pre?.sleepScore);
  return (sleep!==null&&sleep<6)||(battery!==null&&battery<30)||(score!==null&&score<50)||
   /^(bad|poor|low|slabo|słabo|zle|źle|tired|1|2)$/i.test(String(pre?.feeling??''));
 }
 const equipmentContext=exercise=>JSON.stringify([exercise?.id??null,exercise?.equipmentType??null,exercise?.equipment??null,exercise?.equipmentStepKg??null,exercise?.resistanceKind??null,exercise?.weightConvention??null]);
 function currentBlock({exercise,sessionMode='standard',preWorkout,activeFlag}={}){
  if(flagNeedsReview(activeFlag))return 'flag';
  if(observation.isAssistedLoad(exercise))return 'assisted';
  if(sessionMode==='recovery')return 'recovery';
  if(sessionMode!=='standard')return 'invalid_mode';
  if(readinessCaution(preWorkout))return 'readiness';
  return null;
 }
 function standardHistory(sessions,now){
  return (Array.isArray(sessions)?sessions:[]).filter(s=>s&&Array.isArray(s.sets)&&typeof s.date==='string'&&Number.isFinite(Date.parse(s.date))&&Date.parse(s.date)<=now&&(s.sessionMode==null||s.sessionMode==='standard')).slice().sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
 }
 const matches=(row,id)=>row&&String(row.exerciseId)===String(id);
 const hasContext=row=>row?.planId!=null||row?.planSlotIndex!=null;
 function historyBlock({sessions,exerciseId,planId,slotIndex,target,strictContext=false,now=Date.now()}={}){
  const history=standardHistory(sessions,now);
  let rows;
  if(strictContext&&planId!=null&&Number.isInteger(slotIndex)){
   const latest=history.find(s=>s.sets.some(r=>r?.planId===planId));
   if(latest){
    const slot=latest.sets.filter(r=>r?.planId===planId&&r.planSlotIndex===slotIndex);
    if(!slot.length||slot.some(r=>!matches(r,exerciseId)))return 'slot_changed';
    rows=slot;
    const working=rows.filter(r=>!observation.isWarmup(r));
    const count=observation.number(target?.sets);
    if(Number.isInteger(count)&&count>0&&count<=30){
     const expected=Array.from({length:count},(_,i)=>i).filter(i=>!observation.isWarmup(target?.setDetails?.[i]));
     const actual=working.map(r=>r.planSetIndex).sort((a,b)=>a-b);
     if(actual.length!==expected.length||actual.some((v,i)=>!Number.isInteger(v)||v!==expected[i]))return 'incomplete_slot';
    }
   }else if(history.some(s=>s.sets.some(r=>matches(r,exerciseId)&&hasContext(r))))return 'different_context';
  }else if(strictContext){
   const latest=history.find(s=>s.sets.some(r=>matches(r,exerciseId)&&!hasContext(r)));
   if(latest)rows=latest.sets.filter(r=>matches(r,exerciseId)&&!hasContext(r));
   else if(history.some(s=>s.sets.some(r=>matches(r,exerciseId)&&hasContext(r))))return 'different_context';
  }
  if(!rows){
   const latest=history.find(s=>s.sets.some(r=>matches(r,exerciseId)));
   if(!latest)return null;
   rows=latest.sets.filter(r=>matches(r,exerciseId));
  }
  const working=rows.filter(r=>!observation.isWarmup(r));
  if(!working.length)return 'no_working_sets';
  if(working.some(r=>!observation.isTrustedWorking(r)||!observation.validRepetitions(r)||observation.rir(r.rir).status!=='valid'))return 'invalid_observation';
  return null;
 }
 function blockedAdvice(advice,reason){
  const descriptions={
   flag:'Ból, technika lub zmiana sprzętu wymagają ręcznej weryfikacji.',
   assisted:'Ustaw asystę ręcznie — większa pomoc nie oznacza większego obciążenia.',
   recovery:'Trening regeneracyjny — bez automatycznego zwiększania obciążenia.',
   readiness:'Dzisiejsza gotowość ogranicza progresję.',
   invalid_mode:'Nieznany tryb treningu — sprawdź ustawienia.',
   slot_changed:'Ostatnie wykonanie planu nie potwierdza tej pozycji ćwiczenia.',
   incomplete_slot:'Brak kompletu porównywalnych serii na tej pozycji planu.',
   different_context:'Historia pochodzi z innego kontekstu treningowego.',
   no_working_sets:'Ostatnia próba nie zawiera serii roboczych.',
   invalid_observation:'Ostatnia próba zawiera niepełne lub niewiarygodne dane.',
   broad_decline:'Wyniki planu wskazują na spadek wydajności.'
  };
  return {...advice,action:reason==='flag'||reason==='assisted'?'review':'maintain',suggestedWeight:null,reason:descriptions[reason]??'Brak podstaw do automatycznej zmiany obciążenia.',safetyReason:reason};
 }
 return Object.freeze({flagNeedsReview,readinessCaution,equipmentContext,currentBlock,historyBlock,blockedAdvice});
});
