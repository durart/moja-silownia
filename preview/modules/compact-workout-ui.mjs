// Compact active-workout presentation. Existing series controls and timing remain authoritative.
import { isComplete, resolveOpenCard, restoreSelection, extendDeadline } from './compact-workout-core.mjs';
const workout = document.getElementById('workout');
const planRoot = document.getElementById('planWorkout');
const manualRoot = document.getElementById('today');
const storageKey = key + ':compact-workout-ui';
let session = null, selected = null, initialized = false, previous = new Map();
let queued = false;

function persistSelection() {
  try {
    if (session) localStorage.setItem(storageKey, JSON.stringify({session, open:selected}));
    else localStorage.removeItem(storageKey);
  } catch { /* Presentation state is optional if storage is unavailable. */ }
}
function currentSession() {
  return state.startedAt && (state.activePlan || state.manualStarted)
    ? JSON.stringify([state.startedAt, state.activePlan ?? 'manual']) : null;
}
function collectCards() {
  const root = state.activePlan ? planRoot : manualRoot;
  return Array.from(root.querySelectorAll('.exercise-card')).map(card => {
    const slot = card.dataset.workoutSlot;
    const rows = Array.from(card.querySelectorAll(':scope > .hevy-set'));
    return {card, key:slot != null ? 'slot:'+slot : 'exercise:'+card.dataset.exerciseId,
      total:rows.length, done:rows.filter(row=>row.classList.contains('hevy-done')).length};
  });
}
function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
function setText(node, value) {
  if (node.textContent !== value) node.textContent = value;
}
function decorateCard(record) {
  const {card, key:cardKey, done, total} = record;
  const heading = card.querySelector('.sport-exercise-title-row');
  const title = heading?.querySelector('.sport-exercise-title-text');
  if (!heading || !title) return;
  let button = heading.querySelector('.compact-card-toggle');
  if (!button) {
    button = element('button','secondary compact-card-toggle');
    button.type = 'button';
    heading.append(button);
    heading.addEventListener('click', event => {
      if (event.target.closest('button') && event.target.closest('button') !== button) return;
      selected = selected === cardKey ? null : cardKey;
      initialized = true;
      persistSelection();
      refreshCards();
    });
  }
  let status = title.querySelector('.compact-card-status');
  if (!status) {
    status = element('small','compact-card-status');
    title.append(status);
  }
  const open = selected === cardKey, complete = isComplete(record);
  card.classList.toggle('compact-card-collapsed', !open);
  card.classList.toggle('compact-card-complete', complete);
  button.setAttribute('aria-expanded', String(open));
  button.setAttribute('aria-label',(open?'Zwiń ':'Rozwiń ')+(title.querySelector('h2')?.textContent || 'ćwiczenie'));
  setText(button, open ? '⌃' : '⌄');
  setText(status, (complete?'✓ ':'')+done+'/'+total+' serii');
}
function decorateAdvisors(cards) {
  for (const {card} of cards) {
    const advisor = card.querySelector('.advisor-progression');
    if (!advisor || advisor.querySelector('.compact-advisor-toggle')) continue;
    const button = element('button','secondary compact-advisor-toggle','Pokaż uzasadnienie ▾');
    button.type = 'button';
    button.setAttribute('aria-expanded','false');
    advisor.classList.add('compact-advisor-collapsed');
    advisor.append(button);
    button.addEventListener('click',()=>{
      const collapsed = advisor.classList.toggle('compact-advisor-collapsed');
      button.setAttribute('aria-expanded',String(!collapsed));
      setText(button,collapsed?'Pokaż uzasadnienie ▾':'Zwiń uzasadnienie ▴');
    });
  }
}
function refreshCards() {
  const nextSession = currentSession();
  if (nextSession !== session) {
    session = nextSession;
    previous = new Map();
    let restored = {initialized:false,open:null};
    try { if (session) restored = restoreSelection(localStorage.getItem(storageKey), session); } catch {}
    initialized = restored.initialized;
    selected = restored.open;
    if (!session) persistSelection();
  }
  if (!session) return;
  const cards = collectCards();
  if (!cards.length) return;
  const old = selected;
  const wasInitialized = initialized;
  selected = resolveOpenCard(cards, selected, previous, initialized);
  initialized = true;
  const completed = cards.find(card=>card.key===old);
  const before = previous.get(old);
  const advanced = wasInitialized && old !== selected && before && completed &&
    !isComplete(before) && isComplete(completed) && completed.done > before.done;
  previous = new Map(cards.map(({key,done,total})=>[key,{done,total}]));
  for (const card of cards) decorateCard(card);
  decorateAdvisors(cards);
  if (old !== selected || !wasInitialized) persistSelection();
  if (advanced && selected !== null && currentTab === 'workout') {
    const next = cards.find(card=>card.key===selected)?.card;
    requestAnimationFrame(()=>next?.isConnected && next.scrollIntoView({block:'start',behavior:'auto'}));
  }
}

const dock = element('div','compact-workout-dock');
dock.id = 'compactWorkoutDock';
dock.hidden = true;
dock.innerHTML = '<div class="compact-rest-row"><div><small>Przerwa po serii</small><strong id="compactRestRemaining">—</strong></div><button type="button" class="secondary" id="compactRestExtend">+15 s</button><button type="button" class="secondary" id="compactRestSkip">Pomiń</button></div><button type="button" id="compactFinishWorkout">⚑ Zakończ trening</button>';
workout.append(dock);
const remaining = dock.querySelector('#compactRestRemaining');
const extend = dock.querySelector('#compactRestExtend');
const skip = dock.querySelector('#compactRestSkip');
function refreshDock() {
  const running = !!currentSession() && currentTab === 'workout';
  dock.hidden = !running;
  workout.classList.toggle('compact-workout-active',running);
  document.documentElement.classList.toggle('compact-workout-active',running);
  if (!running) return;
  const left = state.restUntil ? Math.max(0,Math.ceil((state.restUntil-Date.now())/1000)) : 0;
  setText(remaining,left ? Math.floor(left/60)+':'+String(left%60).padStart(2,'0') : '—');
  extend.disabled = skip.disabled = left <= 0;
}
extend.addEventListener('click',()=>{
  const next = extendDeadline(state.restUntil,Date.now());
  if (next === null) return;
  const old = state.restUntil;
  state.restUntil = next;
  if (!save()) { state.restUntil = old; note('Nie udało się zapisać przedłużenia przerwy'); return; }
  restAudioStop(); restAudioUnlock(); restAudioSchedule(next); tick(); refreshDock();
});
skip.addEventListener('click',()=>{skipRest();refreshDock();});
dock.querySelector('#compactFinishWorkout').addEventListener('click',()=>{finishWorkout();scheduleRefresh();});
function scheduleRefresh() {
  if (queued) return;
  queued = true;
  queueMicrotask(()=>{queued=false;refreshCards();refreshDock();});
}
const observer = new MutationObserver(scheduleRefresh);
for (const root of [planRoot,manualRoot]) observer.observe(root,{childList:true,subtree:true});
observer.observe(workout,{attributes:true,attributeFilter:['class']});
setInterval(()=>{refreshDock();if (currentSession() !== session) scheduleRefresh();},500);
scheduleRefresh();
