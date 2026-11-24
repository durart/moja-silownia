/* Active Advisor Stage 2: optional, read-only dashboard integration. */
(function(){
'use strict';
const byId=id=>document.getElementById(id);
function escapeHtml(value){return String(value==null?'':value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function text(tag,value,className){const node=document.createElement(tag);if(className)node.className=className;node.textContent=String(value);return node;}
function render(){
 const panel=byId('advisorPanel');
 if(!panel)return;
 try{
  if(!window.MojaAdvisorCore||typeof state==='undefined'){panel.hidden=true;return;}
  const snapshot=window.MojaAdvisorCore.evaluate(state,{weeklyGoal:3});
  panel.replaceChildren();
  const heading=text('div','INTELIGENTNY ASYSTENT · DORADCA AKTYWNY','advisor-overline');
  const title=text('h2','Propozycja na kolejny trening');
  panel.append(heading,title);
  if(snapshot.status==='in_progress'){
   panel.append(text('p','Masz już rozpoczęty trening. Kontynuuj go zamiast rozpoczynać nowy.','advisor-message'));
   const btn=text('button','Wróć do treningu','advisor-action');
   btn.type='button';btn.addEventListener('click',()=>{if(typeof tab==='function')tab('workout');});panel.append(btn);
   panel.hidden=false;return;
  }
  if(snapshot.status==='no_plans'){
   panel.append(text('p','Nie masz jeszcze zapisanego planu. Dodaj plan A/B lub rozpocznij trening dowolny.','advisor-message'));
   const btn=text('button','Przejdź do planów','advisor-action');
   btn.type='button';btn.addEventListener('click',()=>{if(typeof tab==='function')tab('plans');});panel.append(btn);
   panel.hidden=false;return;
  }
  const best=snapshot.recommended;
  if(!best){panel.hidden=true;return;}
  panel.append(text('div',best.planName,'advisor-plan'));
  const confidence={high:'Więcej danych',medium:'Częściowa historia',low:'Mało danych'}[snapshot.confidence]||'Ograniczone dane';
  panel.append(text('p','Pewność danych: '+confidence+'. Wynik regułowy '+best.score+'/100 — nie jest oceną regeneracji.','advisor-meta'));
  if(snapshot.confidence==='low')panel.append(text('p','To wstępna sugestia. Zbyt mało historii, by wiarygodnie ocenić progresję lub gotowość.','advisor-caution'));
  if(snapshot.warning)panel.append(text('p',snapshot.warning,'advisor-caution'));
  const explanation=document.createElement('details');
  const summary=text('summary','Dlaczego ten plan?');
  explanation.append(summary);
  const list=document.createElement('ul');
  for(const reason of best.reasons){list.append(text('li',reason));}
  explanation.append(list);panel.append(explanation);
  const actions=document.createElement('div');actions.className='advisor-actions';
  const start=text('button','Rozpocznij '+best.planName,'advisor-action');start.type='button';
  start.addEventListener('click',()=>{
   try{
    if(typeof state==='undefined'||typeof startPlan!=='function')return;
    const index=Array.isArray(state.plans)?state.plans.findIndex(p=>String(p.id)===String(best.planId)):-1;
    if(index>=0)startPlan(index);
    else if(typeof note==='function')note('Plan został zmieniony. Odśwież rekomendację.');
   }catch(err){console.warn('Asystent: nie udało się otworzyć planu',err);}
  });
  const other=text('button','Wybierz inny plan','advisor-secondary');other.type='button';
  other.addEventListener('click',()=>{if(typeof tab==='function')tab('plans');});
  actions.append(start,other);panel.append(actions);
  panel.hidden=false;
 }catch(err){console.warn('Asystent jest chwilowo niedostępny',err);panel.hidden=true;}
}
function init(){
 const host=byId('dashboard'),hero=byId('dashboardHero');
 if(!host||!hero||byId('advisorPanel'))return;
 const section=document.createElement('section');section.id='advisorPanel';section.className='advisor-panel';section.setAttribute('aria-label','Inteligentny Asystent Treningu');section.hidden=true;
 hero.insertAdjacentElement('afterend',section);
 const old=window.renderDashboard;
 if(typeof old==='function')window.renderDashboard=function(){old();render();};
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
