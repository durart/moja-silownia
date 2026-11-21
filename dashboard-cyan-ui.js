/* Cyan Dashboard v2 — presentation only. Existing workout handlers are untouched. */
(function(){
'use strict';
function format(n){return Math.round(n).toLocaleString('pl-PL')}
function draw(){
 const host=document.getElementById('dashboard');
 if(!host||!window.DashboardCyanCore||typeof state==='undefined')return;
 const data=DashboardCyanCore.snapshot(state,new Date(),3);
 const wk=data.week;
 const count=document.getElementById('dcWeeklyCount'),volume=document.getElementById('dcWeeklyVolume'),minutes=document.getElementById('dcWeeklyMinutes'),goal=document.getElementById('dcGoal'),progress=document.getElementById('dcGoalBar'),last=document.getElementById('dcLast'),trend=document.getElementById('dcTrend');
 if(count)count.textContent=wk.count+' / '+wk.goal;
 if(volume)volume.textContent=format(wk.volume);
 if(minutes)minutes.textContent=format(wk.minutes);
 if(goal)goal.textContent=wk.progress+'%';
 if(progress){progress.style.width=wk.progress+'%';progress.setAttribute('aria-valuenow',String(wk.progress))}
 if(last){const s=data.last;last.textContent=s?(s.planName||'Trening dowolny')+' · '+new Date(s.date).toLocaleDateString('pl-PL')+' · '+Math.round((Number(s.durationSeconds)||0)/60)+' min':'Brak zakończonych treningów';}
 if(trend){
  const v=data.weeks.map(w=>w.volume),max=Math.max(1,...v);
  const points=v.map((n,i)=>(8+i*104)+','+(92-Math.round(n/max*78))).join(' ');
  trend.innerHTML='<svg viewBox="0 0 330 105" role="img" aria-label="Objętość w ostatnich czterech tygodniach"><polyline fill="none" stroke="#21d8e8" stroke-width="3" stroke-linejoin="round" points="'+points+'"/></svg>';
 }
 const muscles=document.getElementById('dcMuscles');
 if(muscles&&typeof fatigueAt==='function'){
  const groups=['Klatka piersiowa','Plecy','Barki','Nogi','Biceps','Triceps'];
  muscles.innerHTML=groups.map(name=>{const n=Math.max(0,Math.min(100,Number(fatigueAt(name))||0));return '<div class="dc-muscle"><div class="dc-row"><span>'+name+'</span><span>'+Math.round(n)+'/100</span></div><div class="dc-meter"><span style="width:'+n+'%"></span></div></div>'}).join('');
 }
}
function init(){
 const host=document.getElementById('dashboard');if(!host||host.dataset.cyanReady)return;
 host.dataset.cyanReady='1';host.classList.add('dashboard-cyan-v2');
 const hero=document.getElementById('dashboardHero');
 if(hero){hero.insertAdjacentHTML('beforebegin','<header class="dc-header"><div><span class="dc-overline">PANEL TRENINGOWY</span><h1>Moja Siłownia</h1><span class="dc-muted">Trening · Postępy · Obciążenie mięśni</span></div><span aria-hidden="true" style="font-size:28px">🏋️</span></header>');}
 const recovery=host.querySelector('.dash-recovery');
 if(recovery){recovery.insertAdjacentHTML('beforebegin','<div class="dc-stats"><div class="dc-card dc-stat"><strong id="dcWeeklyCount">—</strong><small>Treningi w tygodniu</small></div><div class="dc-card dc-stat"><strong id="dcWeeklyVolume">—</strong><small>Objętość kg</small></div><div class="dc-card dc-stat"><strong id="dcWeeklyMinutes">—</strong><small>Czas min</small></div></div><div class="dc-columns"><section class="dc-card"><h2>Cel tygodniowy</h2><div class="dc-row"><strong>3 treningi</strong><span id="dcGoal">—</span></div><div class="dc-meter" role="progressbar" aria-label="Cel tygodniowy" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="dcGoalBarWrap"><span id="dcGoalBar"></span></div></section><section class="dc-card"><h2>Trend objętości · 4 tygodnie</h2><div id="dcTrend"></div></section></div><section class="dc-card"><h2>Ostatni trening</h2><p id="dcLast" class="dc-muted"></p></section>');recovery.insertAdjacentHTML('afterend','<section class="dc-card"><h2>Obciążenie mięśni — szczegóły</h2><p class="dc-note">Szacunek na podstawie treningów, nie pomiar regeneracji.</p><div class="dc-stack" id="dcMuscles"></div></section>');}
 const old=window.renderDashboard;
 if(typeof old==='function')window.renderDashboard=function(){old();draw()};
 draw();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();