/* Shared anatomical atlas: independent overview and focused muscle selection. */
(function(){
 'use strict';
 let selectedMuscle=null;
 let host=null;
 let model=[];
 const escapeText=text=>String(text).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

 function updateSelection(){
  if(!host)return;
  const item=selectedMuscle===null?null:window.MuscleAtlasCore.getMuscle(model,selectedMuscle);
  if(selectedMuscle!==null&&!item)selectedMuscle=null;
  const focused=selectedMuscle!==null;
  const svg=host.querySelector('svg[data-mode="atlas"]');
  if(svg){
   svg.setAttribute('data-view',focused?'focused':'overview');
   const selectedPaths=[];
   svg.querySelectorAll('path.muscle-region[data-muscle]').forEach(path=>{
    const pressed=focused&&path.getAttribute('data-muscle')===selectedMuscle;
    path.setAttribute('data-selected',String(pressed));
    path.setAttribute('aria-pressed',String(pressed));
    if(pressed)selectedPaths.push(path);
   });
   // Restore anatomical path order, then paint chosen contours over overlapping regions.
   const caption=svg.querySelector('.anatomy-caption');
   const pathsById=new Map(Array.from(svg.querySelectorAll('path.muscle-region')).map(path=>[path.id,path]));
   for(const region of window.MuscleAnatomyArt.REGIONS){
    const path=pathsById.get(region.id);
    if(path)svg.insertBefore(path,caption);
   }
   for(const path of selectedPaths)svg.insertBefore(path,caption);
  }
  host.querySelectorAll('.ma-chip[data-muscle]').forEach(button=>{
   button.setAttribute('aria-pressed',String(focused&&button.getAttribute('data-muscle')===selectedMuscle));
  });
  host.querySelector('[data-ma-reset]').hidden=!focused;
  host.querySelector('[data-ma-detail]').hidden=!focused;
  host.querySelector('[data-ma-overview]').hidden=focused;
  if(!focused)return;
  const chosen=window.MuscleAtlasCore.getMuscle(model,selectedMuscle);
  host.querySelector('[data-ma-title]').textContent=chosen.name;
  host.querySelector('[data-ma-score]').textContent=chosen.score+'/100 · '+chosen.label+' obciążenie';
  host.querySelector('[data-ma-count]').textContent=chosen.exerciseCount+' ćwiczeń z tej grupy w katalogu';
  host.querySelector('[data-ma-visit]').disabled=chosen.exerciseCount===0;
 }
 function choose(name){
  if(!window.MuscleAtlasCore.getMuscle(model,name))return;
  selectedMuscle=name;
  updateSelection();
 }
 function showAll(){
  selectedMuscle=null;
  updateSelection();
 }
 function showExercises(){
  const item=window.MuscleAtlasCore.getMuscle(model,selectedMuscle);
  if(!item||!item.exerciseCount||typeof window.tab!=='function'||typeof window.selectMuscle!=='function')return;
  window.tab('catalog');
  window.selectMuscle(item.name);
 }
 function renderAtlas(){
  if(!host||typeof state==='undefined'||!window.MuscleAtlasCore||!window.MuscleFatigueCore||!window.MuscleAnatomyArt)return;
  try{
   model=window.MuscleAtlasCore.buildModel(state.sessions,state.exercises,window.MuscleFatigueCore);
   host.querySelector('[data-ma-svg]').innerHTML=window.MuscleAnatomyArt.renderAtlas(model,selectedMuscle);
   host.querySelector('[data-ma-shortcuts]').innerHTML=model.map(item=>
    '<button type="button" class="ma-chip" data-muscle="'+escapeText(item.name)+'" aria-pressed="false">'+escapeText(item.name)+'</button>'
   ).join('');
   updateSelection();
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
  host.innerHTML='<div class="ma-heading"><div class="ma-heading-row"><h3>Atlas mięśniowy</h3><button type="button" class="ma-reset" data-ma-reset hidden>Pokaż wszystkie</button></div>'+
   '<p>Dotknij mięśnia na sylwetce lub wybierz jego nazwę. Kolor pokazuje szacowane obciążenie z treningów.</p></div>'+
   '<div class="ma-visual" data-ma-svg></div>'+
   '<div class="ma-legend" aria-label="Legenda obciążenia"><span><i class="ma-key ma-key-none"></i>0</span><span><i class="ma-key ma-key-low"></i>1–34</span><span><i class="ma-key ma-key-medium"></i>35–64</span><span><i class="ma-key ma-key-high"></i>65–100</span><small>Obciążenie /100</small></div>'+
   '<div class="ma-shortcuts" data-ma-shortcuts aria-label="Partie mięśniowe"></div>'+
   '<p class="ma-overview-hint" data-ma-overview>Wybierz partię, aby zobaczyć jej szczegóły.</p>'+
   '<div class="ma-detail" data-ma-detail role="status" aria-live="polite" hidden><strong data-ma-title></strong><span data-ma-score></span><small data-ma-count></small><button type="button" class="ma-visit" data-ma-visit>Pokaż ćwiczenia z tej partii</button></div>'+
   '<p class="ma-hint">Szacunek modelu treningowego, nie pomiar regeneracji ani aktywacji EMG.</p>'+
   '<p class="ma-error" data-ma-error hidden>Atlas chwilowo niedostępny. Pozostałe funkcje aplikacji działają normalnie.</p>';
  recovery.appendChild(host);
  host.addEventListener('click',event=>{
   if(event.target.closest('[data-ma-reset]')){showAll();return;}
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
