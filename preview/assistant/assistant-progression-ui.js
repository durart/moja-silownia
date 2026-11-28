/* Etap 3: optional exercise-level progression cards; never modifies persisted state. */
(function(){
'use strict';
function numberRange(target){
 const raw=target?.reps;
 if(typeof raw==='number'&&Number.isInteger(raw)&&raw>0)return {minReps:raw,maxReps:raw};
 if(typeof raw!=='string')return {};
 const match=raw.trim().match(/^(\d+)\s*[-–—]\s*(\d+)$/);
 if(match){const low=Number(match[1]),high=Number(match[2]);return low>0&&high>=low?{minReps:low,maxReps:high}:{};}
 const n=Number(raw.trim());return Number.isInteger(n)&&n>0?{minReps:n,maxReps:n}:{};
}
function currentSession(exerciseId){
 if(typeof state==='undefined'||!Array.isArray(state.active))return [];
 return state.active.filter(x=>String(x.exerciseId)===String(exerciseId));
}
function guidance(result){
 switch(result.action){
  case 'consider_increase':return {label:'Możliwa progresja ciężaru',tone:'progress'};
  case 'consider_decrease':return {label:'Rozważ mniejszy ciężar',tone:'caution'};
  case 'maintain':return {label:'Utrzymaj obecny ciężar',tone:'steady'};
  case 'review':return {label:'Sprawdź wykonanie serii',tone:'caution'};
  default:return {label:'Potrzebujemy więcej danych',tone:'neutral'};
 }
}
function makeTimedCard(exerciseId,options){
 const prepared=options.prepared;
 const messages={timed_initial:['Zacznij od celu czasowego','Brak porównywalnej historii. Wybierz czas z planu i zachowaj technikę.'],timed_increase:['Możliwa progresja czasu','Wykonano wszystkie porównywalne serie. Cel wzrasta o maksymalnie 5 s.'],timed_maintain:['Utrzymaj cel czasowy','Nie ma podstaw do zwiększenia celu. Zapisz rzeczywisty czas każdej serii.'],timed_at_limit:['Osiągnięto górny limit','Utrzymaj cel lub rozważ trudniejszy wariant po opanowaniu techniki.'],timed_recovery:['Trening regeneracyjny','Nie zwiększaj czasu ani dodatkowego obciążenia.'],timed_review:['Sprawdź technikę','Ból, technika lub sprzęt wymagają oceny przed progresją. Nie forsuj pozycji.'],timed_readiness:['Ostrożnie z progresją','Dzisiejszy sen lub samopoczucie ograniczają zwiększanie celu.']};
 const [heading,body]=messages[prepared?.reason]||['Ćwiczenie na czas','Zapisuj rzeczywisty czas w sekundach, bez RIR.'];
 const box=document.createElement('section');box.className='advisor-progression advisor-'+(prepared?.reason==='timed_increase'?'progress':/review|readiness/.test(prepared?.reason||'')?'caution':'steady');
 box.setAttribute('aria-label','Wskazówka progresji czasowej');
 const eyebrow=document.createElement('span');eyebrow.className='advisor-progression-overline';eyebrow.textContent='ASYSTENT · PROGRESJA CZASU';
 const title=document.createElement('strong');title.textContent=heading;
 const reason=document.createElement('p');reason.textContent=body;
 box.append(eyebrow,title,reason);
 const goals=(prepared?.rows||[]).filter(row=>row.setType!=='R'&&Number.isInteger(row.targetDurationSeconds)).map(row=>row.targetDurationSeconds);
 if(goals.length){const goal=document.createElement('small');goal.textContent='Cel serii roboczych: '+goals.map(s=>s+' s').join(' / ');box.append(goal);}
 return box;
}
function livePreparation(exerciseId,options){
 const exercise=state.exercises?.find(item=>String(item.id)===String(exerciseId));
 const plan=state.plans?.find(item=>item.id===state.activePlan);
 const slot=options.slotIndex;
 if(!exercise||state.activePlan!==options.planId||Number.isInteger(slot)&&(!plan||String(state.workoutSwaps?.[slot]??plan.exerciseIds?.[slot])!==String(exerciseId)))return null;
 let target=Number.isInteger(slot)?plan?.targets?.[slot]:null;
 if(target&&state.workoutSwaps?.[slot])target={sets:target.sets};
 return window.MojaTrainerPreparation.prepare({sessions:state.sessions,exercise,target,planId:state.activePlan,slotIndex:slot,plan,sessionMode:state.activeSessionMode,preWorkout:state.preWorkout,activeFlag:state.activeExerciseNotes?.[exerciseId]?.flag});
}
function rowSignature(input){
 return JSON.stringify([...(input.closest('.hevy-set')?.querySelectorAll('input,select')||[])].map(field=>[field.id,field.value]));
}
function makeCard(exerciseId,options={}){
 const exercise=state.exercises?.find(item=>String(item.id)===String(exerciseId));
 if(window.MojaTimedWorkout?.isTimed(exerciseId))return makeTimedCard(exerciseId,options);
 const prepared=options.prepared||livePreparation(exerciseId,options);
 const result=prepared?.advice||{action:'insufficient_data',reason:'Brak porównywalnych danych do progresji.'};
 const safety=window.MojaRecommendationSafety;
 const block=safety.currentBlock({exercise,sessionMode:state.activeSessionMode,preWorkout:state.preWorkout,activeFlag:state.activeExerciseNotes?.[exerciseId]?.flag});
 const cautionToday=block!==null;
 const reasons={recovery:'Trening regeneracyjny: nie zwiększam obciążenia. Gdy nie ma porównywalnej sesji regeneracyjnej, wybierz lekki ciężar samodzielnie.',review:'Ból, technika, asysta lub zmiana sprzętu wymagają ręcznej weryfikacji obciążenia.',context_review:'Historia nie potwierdza bezpiecznej zmiany obciążenia.',readiness:'Dzisiejsze samopoczucie lub sen ograniczają progresję.',plan:'Brak porównywalnej historii. Uzupełniam tylko znane parametry planu.',history:'Wykorzystuję porównywalne, zakończone serie. Zachowuję układ ciężarów.'};
 const meta=prepared&&reasons[prepared.reason]?{label:prepared.reason==='recovery'?'Trening regeneracyjny':prepared.reason==='review'?'Sprawdź obciążenie':'Przygotowanie serii',tone:prepared.reason==='review'||prepared.reason==='readiness'?'caution':'steady'}:guidance(result),box=document.createElement('section');
 box.className='advisor-progression advisor-'+meta.tone;box.setAttribute('aria-label','Wskazówka progresji treningowej');
 const eyebrow=document.createElement('span');eyebrow.className='advisor-progression-overline';eyebrow.textContent='ASYSTENT · PROGRESJA';
 const title=document.createElement('strong');title.textContent=meta.label;
 const reason=document.createElement('p');reason.textContent=prepared&&reasons[prepared.reason]?reasons[prepared.reason]+' '+result.reason:result.reason;
 box.append(eyebrow,title,reason);
 if(result.action==='consider_increase'&&Number.isFinite(result.increment)&&(!prepared||prepared.reason==='progression')){
  const detail=document.createElement('small');
  detail.textContent='Ścieżka: '+({FAST_TRACK_1_SESSION:'szybka',ACCELERATED_2_SESSIONS:'przyspieszona',E1RM_TREND_CONFIRMED:'trend e1RM',REPS_TREND_CONFIRMED:'trend powtórzeń',STANDARD_3_SESSIONS:'standardowa'}[result.path]||'standardowa')+' • sugerowany skok: +'+result.increment+' kg';
  box.append(detail);
 }
 const ongoing=currentSession(exerciseId).filter(x=>x.setType!=='R').length;
 if(ongoing){const info=document.createElement('small');info.textContent='W bieżącym treningu zapisano już '+ongoing+' serii tego ćwiczenia. Sugestia bazuje na ostatnim zakończonym treningu.';box.append(info);}
 if(result.action==='consider_increase'&&cautionToday){const info=document.createElement('small');info.className='advisor-readiness-caution';info.textContent='Wyniki serii pozwalają rozważyć progresję, ale dzisiejszy sen lub samopoczucie sugerują ostrożność. Możesz utrzymać obecny ciężar albo zmniejszyć objętość. To nie jest medyczna ocena regeneracji.';box.append(info);}
 if(result.action==='consider_increase'&&!cautionToday&&prepared?.reason==='progression'){
  const caution=document.createElement('small');caution.textContent='Nie zwiększaj ciężaru przy bólu, pogorszeniu techniki lub dużym zmęczeniu. Ostateczna decyzja należy do Ciebie.';box.append(caution);
  if(Number.isFinite(result.suggestedWeight)&&!window.MojaTrainerDrafts?.active(state)){
   const apply=document.createElement('button');apply.type='button';apply.className='secondary';apply.textContent='Ustaw '+result.suggestedWeight+' kg w tym treningu';
   const workout=state.startedAt;
   const equipmentAtRender=safety.equipmentContext(exercise);
   const baseline=new Map([...(options.card?.querySelectorAll('input[id$="_w"]')||[])].map(input=>[input.id,rowSignature(input)]));
   const fresh=()=>{
    const currentExercise=state.exercises?.find(item=>String(item.id)===String(exerciseId));
    if(!currentExercise||safety.equipmentContext(currentExercise)!==equipmentAtRender)return false;
    if(!workout||state.startedAt!==workout||!box.isConnected||window.MojaTrainerDrafts?.active(state))return false;
    const current=livePreparation(exerciseId,options);
    return current?.reason==='progression'&&current.advice?.action==='consider_increase'&&current.advice.suggestedWeight===result.suggestedWeight&&current.advice.weight===result.weight;
   };
   const reject=()=>{apply.disabled=true;alert('Warunki treningu się zmieniły. Odśwież zalecenie.');};
   apply.addEventListener('click',()=>{
    if(!fresh()){reject();return;}
    if(!confirm('Ustawić '+result.suggestedWeight+' kg w niezapisanych, niezmienionych seriach roboczych tego ćwiczenia? Historia i plan pozostaną bez zmian.'))return;
    if(!fresh()){reject();return;}
    const card=box.closest('.exercise-card');
    const inputs=[...(card?.querySelectorAll('input[id$="_w"]')||[])].filter(input=>!input.closest('.hevy-done')&&
      document.getElementById(input.id.replace(/_w$/,'_type'))?.value==='W'&&
      input.value!==''&&Number(input.value)===result.weight&&baseline.get(input.id)===rowSignature(input));
    if(!inputs.length){apply.disabled=true;alert('Nie ma niezapisanych, niezmienionych serii z tym ciężarem.');return;}
    for(const input of inputs){input.value=String(result.suggestedWeight);input.dispatchEvent(new Event('change',{bubbles:true}));}
    apply.textContent='Ustawiono '+result.suggestedWeight+' kg';apply.disabled=true;
   });box.append(apply);
  }
 }
 if(result.action==='consider_decrease'&&Number.isFinite(result.suggestedWeight)){
  const detail=document.createElement('small');detail.textContent='Sugerowany ciężar: '+result.suggestedWeight+' kg';box.append(detail);
 }
 if(result.needsEquipment){
  const info=document.createElement('small');info.textContent='Wybierz rodzaj sprzętu, aby otrzymać poprawną propozycję ciężaru.';box.append(info);
 }
 if(result.blockedByStep){
  const info=document.createElement('small');info.textContent='Dostępny skok jest zbyt duży dla bezpiecznej rekomendacji automatycznej.';box.append(info);
 }
 if(window.MojaAdvisorEquipmentUI?.decorate){
  window.MojaAdvisorEquipmentUI.decorate(box,exercise,()=>{if(window.MojaTrainerDrafts?.active(state)){if(state.activePlan)renderPlanWorkout();else renderWorkout();}else box.replaceWith(makeCard(exerciseId,options));});
 }
 if(Number.isFinite(result.weight)){
  const info=document.createElement('span');info.className='advisor-progression-weight';info.textContent='Ciężar roboczy (ostatni trening): '+result.weight+' kg';box.append(info);
 }
 if(Number.isFinite(result.bestWeight)){
  const detail=document.createElement('small');
  detail.textContent='Najcięższa seria ostatnio: '+result.lastTopWeight+' kg × '+result.lastTopReps+
   ' • Największy ciężar w historii: '+result.bestWeight+' kg'+
   ' • Treningi w historii: '+result.sessionCount;
  box.append(detail);
 }
 return box;
}
function decorate(root,mode){
 if(!root||!window.MojaAdvisorProgression||typeof state==='undefined')return;
 const cards=[...root.querySelectorAll('.exercise-card')].filter(card=>!window.MojaCardioCatalog?.isCardio(state.exercises.find(e=>e.id===card.dataset.exerciseId)));
 for(const card of cards){
  if(card.querySelector('.advisor-progression'))continue;
  let id=card.dataset.exerciseId;
  if(!id){
   const inputs=[...card.querySelectorAll('input[id$="_w"]')];
   const first=inputs[0]?.id||'';
   if(first.startsWith('m_')){const suffix=first.slice(2,-2);const candidate=state.exercises.filter(x=>suffix.startsWith(String(x.id)+'_')).sort((a,b)=>String(b.id).length-String(a.id).length)[0];id=candidate?.id;}
  }
  if(!id||!state.exercises.some(e=>String(e.id)===String(id)))continue;
  const target=mode==='plan'?(()=>{
   const input=card.querySelector('input[id^="r_"][id$="_w"]');
   const slot=input?.id.match(/^r_(\d+)_\d+_w$/);
   const plan=state.plans.find(p=>p.id===state.activePlan);
   return slot?plan?.targets?.[Number(slot[1])]:null;
  })():null;
  const planInput=card.querySelector('input[id^="r_"][id$="_w"]');
  const slotMatch=planInput?.id.match(/^r_(\d+)_\d+_w$/);
  const prepared=window.MojaTrainerDrafts?.get(state,id,slotMatch?Number(slotMatch[1]):null);
  const cardNode=makeCard(id,{...numberRange(target),prepared,card,planId:state.activePlan,slotIndex:slotMatch?Number(slotMatch[1]):null});
  if(window.MojaTrainerDrafts?.active(state)){
   if(!window.MojaTrainerDrafts.settings(state).explanation)continue;
   const label=document.createElement('small');label.textContent=window.MojaTimedWorkout?.isTimed(id)?'Asystent przygotował edytowalne cele czasowe. Zapisz faktyczny czas.':'Asystent przygotował edytowalne serie. RIR wpisz po wykonaniu.';cardNode.prepend(label);
  }
  const heading=card.querySelector('.sport-exercise-title-row');
  if(heading)heading.insertAdjacentElement('afterend',cardNode);
 }
}
function safely(root,mode){try{decorate(root,mode)}catch(error){console.warn('Wskazówki progresji są niedostępne',error)}}
function init(){
 if(window.__mojaAdvisorProgressionReady)return;
 window.__mojaAdvisorProgressionReady=true;
 const plan=window.renderPlanWorkout,manual=window.renderToday;
 if(typeof plan==='function')window.renderPlanWorkout=function(){const result=plan.apply(this,arguments);safely(document.getElementById('planWorkout'),'plan');return result;};
 if(typeof manual==='function')window.renderToday=function(){const result=manual.apply(this,arguments);safely(document.getElementById('today'),'manual');return result;};
 safely(document.getElementById('planWorkout'),'plan');
 safely(document.getElementById('today'),'manual');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
