/* Accessible SVG atlas, using only the existing canonical fatigue model. */
(function(){
 'use strict';
 const REGIONS=[
  ['Klatka piersiowa',['M119 125 Q143 112 175 133 L174 178 Q145 197 122 176 Q109 154 119 125Z','M181 133 Q211 111 236 125 Q248 154 233 176 Q210 195 181 178Z']],
  ['Plecy',['M446 116 Q474 123 514 153 Q555 123 584 116 L566 214 Q541 260 515 284 Q487 256 463 214Z']],
  ['Barki',['M107 123 Q110 102 134 105 L145 121 Q120 142 115 166 Q98 156 107 123Z','M223 121 Q242 100 255 113 Q270 133 262 160 L248 165 Q246 137 223 121Z','M428 120 Q443 97 463 105 L478 120 Q447 137 439 165 Q421 158 428 120Z','M552 120 Q573 99 589 108 Q610 133 601 162 L588 166 Q584 139 552 120Z']],
  ['Biceps',['M107 160 Q111 150 125 158 L130 203 Q123 228 110 231 Q96 215 107 160Z','M253 157 Q265 150 273 164 L286 218 Q273 234 263 218Z']],
  ['Triceps',['M433 159 Q444 152 454 162 L456 210 Q446 233 433 225 Q420 205 433 159Z','M585 161 Q598 153 605 167 L620 217 Q608 234 595 220Z']],
  ['Brzuch',['M145 185 Q179 196 215 185 L217 286 Q181 302 145 286Z']],
  ['Nogi',['M138 305 Q168 294 177 314 L167 443 Q143 464 126 426Z','M192 314 Q208 295 231 306 L242 426 Q226 466 201 443Z','M465 305 Q488 296 506 315 L498 442 Q475 461 454 426Z','M522 315 Q542 294 566 305 L577 426 Q553 463 531 443Z']],
  ['Łydki',['M130 448 Q151 466 167 448 L162 508 Q147 533 133 509Z','M204 448 Q224 466 239 448 L232 509 Q218 533 207 508Z','M457 448 Q477 466 496 448 L489 509 Q474 533 461 508Z','M533 448 Q552 466 574 448 L566 508 Q552 534 537 509Z']],
  ['Przedramiona',['M94 231 L112 241 Q91 293 69 309 L58 299Z','M275 239 L290 233 L323 301 L313 309Z','M421 232 L440 243 L397 309 L387 302Z','M606 240 L620 232 L652 303 L642 310Z']]
 ];
 const SILHOUETTE=[
  '<g class="ma-silhouette">',
  '<ellipse cx="180" cy="68" rx="27" ry="32"/><ellipse cx="515" cy="68" rx="27" ry="32"/>',
  '<path d="M163 93 L163 108 L197 108 L197 93Z M498 93 L498 108 L532 108 L532 93Z"/>',
  '<path d="M135 107 Q160 112 180 119 Q202 112 228 107 Q250 111 259 139 L290 219 L320 301 L307 312 L273 247 L253 194 L239 305 L243 429 L233 517 L207 522 L189 450 L180 328 L171 450 L153 522 L127 517 L118 429 L121 305 L106 194 L86 248 L54 312 L41 301 L72 219 L101 139 Q110 112 135 107Z"/>',
  '<path d="M470 107 Q495 112 515 119 Q537 112 563 107 Q585 111 594 139 L625 219 L655 301 L642 312 L608 247 L588 194 L574 305 L578 429 L568 517 L542 522 L524 450 L515 328 L506 450 L488 522 L462 517 L453 429 L456 305 L441 194 L421 248 L389 312 L376 301 L407 219 L436 139 Q445 112 470 107Z"/>',
  '</g><g class="ma-anatomy-lines"><path d="M180 132 V285 M148 185 Q180 202 212 185 M515 153 V279 M474 208 Q515 227 556 208"/></g>'
 ].join('');
 let selected='Klatka piersiowa',host=null,model=[];
 const escapeText=text=>String(text).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 function svgMarkup(){
  const byName=new Map(model.map(item=>[item.name,item]));
  const areas=REGIONS.map(([name,paths])=>{
   const item=byName.get(name);if(!item)return '';
   const safe=escapeText(name),desc=safe+', '+item.score+' na 100, '+item.label;
   return '<g class="ma-region ma-level-'+item.level+'" data-muscle="'+safe+'" role="button" tabindex="0" aria-pressed="'+String(name===selected)+'" aria-label="'+desc+'"><title>'+desc+'</title>'+paths.map(d=>'<path d="'+d+'"/>').join('')+'</g>';
  }).join('');
  return '<svg class="ma-svg" viewBox="25 18 645 535" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Atlas mięśni: sylwetka z przodu i z tyłu">'+SILHOUETTE+areas+'<g class="ma-view-labels"><text x="180" y="547">PRZÓD</text><text x="515" y="547">TYŁ</text></g></svg>';
 }
 function refreshSelection(){
  if(!host)return;
  const item=window.MuscleAtlasCore.getMuscle(model,selected)||model[0];if(!item)return;
  selected=item.name;
  host.querySelectorAll('[data-muscle]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.muscle===selected)));
  host.querySelector('[data-ma-title]').textContent=item.name;
  host.querySelector('[data-ma-score]').textContent=item.score+'/100 · '+item.label+' obciążenie';
  host.querySelector('[data-ma-count]').textContent=item.exerciseCount+' ćwiczeń z tej grupy w katalogu';
  host.querySelector('[data-ma-visit]').disabled=item.exerciseCount===0;
 }
 function choose(name){
  if(!window.MuscleAtlasCore.getMuscle(model,name))return;
  selected=name;refreshSelection();
 }
 function showExercises(){
  const item=window.MuscleAtlasCore.getMuscle(model,selected);
  if(!item||!item.exerciseCount||typeof window.tab!=='function'||typeof window.selectMuscle!=='function')return;
  window.tab('catalog');
  window.selectMuscle(item.name);
 }
 function renderAtlas(){
  if(!host||typeof state==='undefined'||!window.MuscleAtlasCore||!window.MuscleFatigueCore)return;
  try{
   model=window.MuscleAtlasCore.buildModel(state.sessions,state.exercises,window.MuscleFatigueCore);
   host.querySelector('[data-ma-svg]').innerHTML=svgMarkup();
   host.querySelector('[data-ma-shortcuts]').innerHTML=model.map(item=>'<button type="button" class="ma-chip" data-muscle="'+escapeText(item.name)+'" aria-pressed="'+String(item.name===selected)+'">'+escapeText(item.name)+'</button>').join('');
   refreshSelection();
   host.querySelector('[data-ma-error]').hidden=true;
  }catch(error){
   console.warn('Muscle atlas unavailable',error);
   host.querySelector('[data-ma-error]').hidden=false;
  }
 }
 function initialize(){
  if(host||!window.MuscleAtlasCore||!window.MuscleFatigueCore)return;
  const recovery=document.querySelector('#dashboard .dash-recovery');if(!recovery)return;
  host=document.createElement('section');
  host.id='muscleAtlas';host.className='ma-atlas';host.setAttribute('aria-label','Interaktywny atlas mięśniowy');
  host.innerHTML='<div class="ma-heading"><h3>Atlas mięśniowy</h3><p>Dotknij mięśnia na sylwetce lub wybierz jego nazwę. Kolor pokazuje szacowane obciążenie z treningów.</p></div>'+
   '<div class="ma-visual" data-ma-svg></div><div class="ma-shortcuts" data-ma-shortcuts aria-label="Partie mięśniowe"></div>'+
   '<div class="ma-detail" role="status" aria-live="polite"><strong data-ma-title></strong><span data-ma-score></span><small data-ma-count></small><button type="button" class="ma-visit" data-ma-visit>Pokaż ćwiczenia z tej partii</button></div>'+
   '<p class="ma-hint">Szacunek modelu treningowego, nie pomiar regeneracji ani aktywacji EMG.</p>'+
   '<p class="ma-error" data-ma-error hidden>Atlas chwilowo niedostępny. Pozostałe funkcje aplikacji działają normalnie.</p>';
  recovery.appendChild(host);
  host.addEventListener('click',event=>{
   const target=event.target.closest('[data-muscle]');
   if(target){choose(target.dataset.muscle);return;}
   if(event.target.closest('[data-ma-visit]'))showExercises();
  });
  host.addEventListener('keydown',event=>{
   if(event.key!=='Enter'&&event.key!==' ')return;
   const target=event.target.closest('.ma-region[data-muscle]');if(!target)return;
   event.preventDefault();choose(target.dataset.muscle);
  });
  const previous=window.renderDashboard;
  if(typeof previous==='function')window.renderDashboard=function(){
   const result=previous.apply(this,arguments);renderAtlas();return result;
  };
  renderAtlas();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
