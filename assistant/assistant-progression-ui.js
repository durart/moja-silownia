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
  case 'maintain':return {label:'Utrzymaj obecny ciężar',tone:'steady'};
  case 'review':return {label:'Sprawdź wykonanie serii',tone:'caution'};
  default:return {label:'Potrzebujemy więcej danych',tone:'neutral'};
 }
}
function makeCard(exerciseId,options={}){
 const result=window.MojaAdvisorProgression.suggest(state.sessions,exerciseId,options);
 const pre=state.preWorkout||{};
 const lowFeeling=typeof pre.feeling==='string'&&/^(bad|poor|low|slabo|słabo|zle|źle|tired|1|2)$/i.test(pre.feeling);
 const shortSleep=Number(pre.sleepHours)>0&&Number(pre.sleepHours)<6;
 const lowBattery=pre.battery!=null&&pre.battery!==''&&Number(pre.battery)<30;
 const lowSleepScore=pre.sleepScore!=null&&pre.sleepScore!==''&&Number(pre.sleepScore)<50;
 const cautionToday=lowFeeling||shortSleep||lowBattery||lowSleepScore;
 const meta=guidance(result),box=document.createElement('section');
 box.className='advisor-progression advisor-'+meta.tone;box.setAttribute('aria-label','Wskazówka progresji treningowej');
 const eyebrow=document.createElement('span');eyebrow.className='advisor-progression-overline';eyebrow.textContent='ASYSTENT · PROGRESJA';
 const title=document.createElement('strong');title.textContent=meta.label;
 const reason=document.createElement('p');reason.textContent=result.reason;
 box.append(eyebrow,title,reason);
 const ongoing=currentSession(exerciseId).filter(x=>x.setType!=='R').length;
 if(ongoing){const info=document.createElement('small');info.textContent='W bieżącym treningu zapisano już '+ongoing+' serii tego ćwiczenia. Sugestia bazuje na ostatnim zakończonym treningu.';box.append(info);}
 if(result.action==='consider_increase'&&cautionToday){const info=document.createElement('small');info.className='advisor-readiness-caution';info.textContent='Wyniki serii pozwalają rozważyć progresję, ale dzisiejszy sen lub samopoczucie sugerują ostrożność. Możesz utrzymać obecny ciężar albo zmniejszyć objętość. To nie jest medyczna ocena regeneracji.';box.append(info);}
 if(result.action==='consider_increase'&&!cautionToday&&!['pain','equipment','technique'].includes(state.activeExerciseNotes?.[exerciseId]?.flag)){
  const caution=document.createElement('small');caution.textContent='Nie zwiększaj ciężaru przy bólu, pogorszeniu techniki lub dużym zmęczeniu. Ostateczna decyzja należy do Ciebie.';box.append(caution);
  if(Number.isFinite(result.suggestedWeight)){
   const apply=document.createElement('button');apply.type='button';apply.className='secondary';apply.textContent='Ustaw '+result.suggestedWeight+' kg w tym treningu';
   apply.addEventListener('click',()=>{
    if(!confirm('Ustawić '+result.suggestedWeight+' kg w niezapisanych seriach tego ćwiczenia? Historia i plan pozostaną bez zmian.'))return;
    const card=box.closest('.exercise-card');
    const inputs=[...(card?.querySelectorAll('input[id$="_w"]')||[])].filter(input=>!input.closest('.hevy-done'));
    for(const input of inputs){input.value=String(result.suggestedWeight);input.dispatchEvent(new Event('change',{bubbles:true}));}
    apply.textContent='Ustawiono '+result.suggestedWeight+' kg';apply.disabled=true;
   });box.append(apply);
  }
 }
 if(Number.isFinite(result.weight)){
  const info=document.createElement('span');info.className='advisor-progression-weight';info.textContent='Ostatnio: '+result.weight+' kg';box.append(info);
 }
 return box;
}
function decorate(root,mode){
 if(!root||!window.MojaAdvisorProgression||typeof state==='undefined')return;
 const cards=[...root.querySelectorAll('.exercise-card')];
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
  const cardNode=makeCard(id,numberRange(target));
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
