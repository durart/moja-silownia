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
 function rowContext(row){
  if(hasContext(row))return row.planId!=null&&Number.isInteger(row.planSlotIndex)&&row.planSlotIndex>=0?'plan':'ambiguous';
  if(row?.planSetIndex!=null)return 'ambiguous';
  if(row?.manualSetIndex!=null)return Number.isInteger(row.manualSetIndex)&&row.manualSetIndex>=0?'manual':'ambiguous';
  return 'legacy';
 }
 function contextKey(row){
  const kind=rowContext(row);
  return kind==='plan'?JSON.stringify([kind,row.planId,row.planSlotIndex]):kind;
 }
 function manualHistory(sessions,id,now=Date.now()){
  const attempts=standardHistory(sessions,now).map(s=>({...s,sets:s.sets.filter(r=>matches(r,id))})).filter(s=>s.sets.length);
  if(!attempts.length)return {history:[],reason:null};
  const latest=attempts[0],kinds=new Set(latest.sets.map(rowContext));
  const kind=kinds.size===1?[...kinds][0]:'ambiguous';
  if(kind!=='manual'&&kind!=='legacy')return {history:[],reason:'different_context'};
  if(kind==='legacy'&&attempts.some(s=>s.sets.some(r=>rowContext(r)!=='legacy')))return {history:[],reason:'different_context'};
  // Keep the contiguous comparable history, not older observations from before a context switch.
  const history=[];
  for(const s of attempts){
   if(s.sets.some(r=>rowContext(r)!==kind))break;
   history.push(s);
  }
  return {history,reason:null};
 }
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
   }else if(history.some(s=>s.sets.some(r=>matches(r,exerciseId)&&rowContext(r)!=='legacy')))return 'different_context';
  }else if(strictContext){
   const manual=manualHistory(sessions,exerciseId,now);
   if(manual.reason)return manual.reason;
   if(manual.history.length)rows=manual.history[0].sets;
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
 return Object.freeze({flagNeedsReview,readinessCaution,equipmentContext,currentBlock,historyBlock,blockedAdvice,rowContext,contextKey,manualHistory});
});
