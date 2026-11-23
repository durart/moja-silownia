/* Interactive atlas powered by the same approved anatomical art as summaries. */
(function(){
 'use strict';
 let selected='Klatka piersiowa';
 let host=null;
 let model=[];
 const escapeText=text=>String(text).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 function renderMarkup(){
  return window.MuscleAnatomyArt.renderAtlas(model,selected);
 }
 function refreshSelection(){
  if(!host)return;
  const item=window.MuscleAtlasCore.getMuscle(model,selected)||model[0];
  if(!item)return;
  selected=item.name;
  host.querySelectorAll('[data-muscle]').forEach(element=>{
   element.setAttribute('aria-pressed',String(element.getAttribute('data-muscle')===selected));
  });
  host.querySelector('[data-ma-title]').textContent=item.name;
  host.querySelector('[data-ma-score]').textContent=item.score+'/100 · '+item.label+' obciążenie';
  host.querySelector('[data-ma-count]').textContent=item.exerciseCount+' ćwiczeń z tej grupy w katalogu';
  host.querySelector('[data-ma-visit]').disabled=item.exerciseCount===0;
 }
 function choose(name){
  if(!window.MuscleAtlasCore.getMuscle(model,name))return;
  selected=name;
  refreshSelection();
 }
 function showExercises(){
  const item=window.MuscleAtlasCore.getMuscle(model,selected);
  if(!item||!item.exerciseCount||typeof window.tab!=='function'||typeof window.selectMuscle!=='function')return;
  window.tab('catalog');
  window.selectMuscle(item.name);
 }
 function renderAtlas(){
  if(!host||typeof state==='undefined'||!window.MuscleAtlasCore||!window.MuscleFatigueCore||!window.MuscleAnatomyArt)return;
  try{
   model=window.MuscleAtlasCore.buildModel(state.sessions,state.exercises,window.MuscleFatigueCore);
   host.querySelector('[data-ma-svg]').innerHTML=renderMarkup();
   host.querySelector('[data-ma-shortcuts]').innerHTML=model.map(item=>
    '<button type="button" class="ma-chip" data-muscle="'+escapeText(item.name)+'" aria-pressed="'+String(item.name===selected)+'">'+escapeText(item.name)+'</button>'
   ).join('');
   refreshSelection();
   host.querySelector('[data-ma-error]').hidden=true;
  }catch(error){
   console.warn('Muscle atlas unavailable',error);
   host.querySelector('[data-ma-error]').hidden=false;
  }
 }
 function initialize(){
  if(host||!window.MuscleAtlasCore||!window.MuscleFatigueCore||!window.MuscleAnatomyArt)return;
  const recovery=document.querySelector('#dashboard .dash-recovery');
  if(!recovery)return;
  host=document.createElement('section');
  host.id='muscleAtlas';
  host.className='ma-atlas';
  host.setAttribute('aria-label','Interaktywny atlas mięśniowy');
  host.innerHTML='<div class="ma-heading"><h3>Atlas mięśniowy</h3><p>Dotknij mięśnia na sylwetce lub wybierz jego nazwę. Kolor pokazuje szacowane obciążenie z treningów.</p></div>'+
   '<div class="ma-visual" data-ma-svg></div><div class="ma-shortcuts" data-ma-shortcuts aria-label="Partie mięśniowe"></div>'+
   '<div class="ma-detail" role="status" aria-live="polite"><strong data-ma-title></strong><span data-ma-score></span><small data-ma-count></small><button type="button" class="ma-visit" data-ma-visit>Pokaż ćwiczenia z tej partii</button></div>'+
   '<p class="ma-hint">Szacunek modelu treningowego, nie pomiar regeneracji ani aktywacji EMG.</p>'+
   '<p class="ma-error" data-ma-error hidden>Atlas chwilowo niedostępny. Pozostałe funkcje aplikacji działają normalnie.</p>';
  recovery.appendChild(host);
  host.addEventListener('click',event=>{
   const target=event.target.closest('[data-muscle]');
   if(target){choose(target.getAttribute('data-muscle'));return;}
   if(event.target.closest('[data-ma-visit]'))showExercises();
  });
  host.addEventListener('keydown',event=>{
   if(event.key!=='Enter'&&event.key!==' ')return;
   const target=event.target.closest('path.muscle-region[data-muscle]');
   if(!target)return;
   event.preventDefault();
   choose(target.getAttribute('data-muscle'));
  });
  const previous=window.renderDashboard;
  if(typeof previous==='function')window.renderDashboard=function(){
   const result=previous.apply(this,arguments);
   renderAtlas();
   return result;
  };
  renderAtlas();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
 else initialize();
})();