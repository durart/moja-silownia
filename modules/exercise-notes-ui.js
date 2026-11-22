import { getExerciseNote, setExerciseNote, progressionNoteConstraint } from './exercise-notes.js';

const flagLabels = [['none','Bez oznaczenia'],['pain','Ból / dyskomfort'],['equipment','Inna maszyna / sprzęt'],['technique','Problem z techniką']];
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function currentNotes() {
  return state.activeExerciseNotes && typeof state.activeExerciseNotes === 'object' ? state.activeExerciseNotes : {};
}
function previousNote(id) {
  for (const session of state.sessions || []) {
    if (!session.sets?.some(set => String(set.exerciseId) === String(id))) continue;
    const note = getExerciseNote(session.exerciseNotes, id);
    if (note.text.trim() || note.flag !== 'none') return note;
  }
  return null;
}
function noteMarkup(id) {
  const note = getExerciseNote(currentNotes(), id);
  const previous = previousNote(id);
  const options = flagLabels.map(([value,label]) => `<option value="${value}" ${note.flag===value?'selected':''}>${label}</option>`).join('');
  return `<div class="exercise-note-panel" data-note-id="${escapeHtml(id)}">
    <label>Notatka do całego ćwiczenia
      <textarea class="exercise-note-text" rows="2" maxlength="2000" placeholder="Np. bolał bark, inna maszyna...">${escapeHtml(note.text)}</textarea>
    </label>
    <label>Oznaczenie <select class="exercise-note-flag">${options}</select></label>
    ${previous ? `<details><summary>Poprzednia notatka</summary><p>${escapeHtml(previous.text || flagLabels.find(([value])=>value===previous.flag)?.[1] || '')}</p></details>` : ''}
  </div>`;
}
function decorate(root) {
  if (!root) return;
  for (const card of root.querySelectorAll('.exercise-card')) {
    if (card.querySelector('.exercise-note-panel')) continue;
    let id = card.dataset.exerciseId;
    if (!id) {
      const input = card.querySelector('input[id^="m_"][id$="_w"]');
      const candidates = (state.exercises || []).filter(e => input?.id.startsWith('m_'+e.id+'_')).sort((a,b)=>String(b.id).length-String(a.id).length);
      id = candidates[0]?.id;
    }
    if (!id) continue;
    card.insertAdjacentHTML('beforeend', noteMarkup(String(id)));
    updateProgressionWarning(card, String(id));
  }
}
function refreshNotes() {
  decorate(document.getElementById('planWorkout'));
  decorate(document.getElementById('today'));
}
function onNoteChange(event) {
  const panel = event.target.closest('.exercise-note-panel');
  if (!panel) return;
  const id = panel.dataset.noteId;
  const next = setExerciseNote(currentNotes(), id, {
    text: panel.querySelector('.exercise-note-text').value,
    flag: panel.querySelector('.exercise-note-flag').value
  });
  state.activeExerciseNotes = next;
  save();
  updateProgressionWarning(panel.closest('.exercise-card'), id);

}
function decorateHistory() {
  const root = document.getElementById('historyList');
  if (!root) return;
  const items = [...root.querySelectorAll(':scope > .item')];
  items.forEach((item,index)=>{
    const session = state.sessions?.[index];
    if (!session?.exerciseNotes || item.querySelector('.history-exercise-notes')) return;
    const notes = Object.entries(session.exerciseNotes).filter(([,n])=>n && (n.text?.trim() || n.flag !== 'none'));
    if (!notes.length) return;
    const detail = item.querySelector('details');
    if (!detail) return;
    const block = document.createElement('div');
    block.className='history-exercise-notes';
    for (const [id,raw] of notes) {
      const note = getExerciseNote(session.exerciseNotes,id);
      const exercise = state.exercises.find(e=>String(e.id)===id);
      const p = document.createElement('p');
      const flag = flagLabels.find(([value])=>value===note.flag)?.[1];
      p.textContent = (exercise?.name || 'Ćwiczenie')+': '+note.text+(note.flag!=='none'?' ['+flag+']':'');
      block.append(p);
    }
    detail.append(block);
  });
}
function wrapRender(name,callback) {
  const original = window[name];
  if (typeof original !== 'function') return;
  window[name] = function(...args) { const result=original.apply(this,args);callback();return result; };
}
function updateProgressionWarning(card, id) {
  const advisor = card?.querySelector('.advisor-progression');
  if (!advisor) return;
  const current = getExerciseNote(currentNotes(), id);
  const prior = previousNote(id);
  const currentConstraint = progressionNoteConstraint(current);
  const priorConstraint = progressionNoteConstraint(prior);
  const constraint = !currentConstraint.allowIncrease ? currentConstraint : priorConstraint;
  let warning = advisor.querySelector('.exercise-note-warning');
  if (!constraint.allowIncrease) {
    if (!warning) {
      warning = document.createElement('small');
      warning.className = 'exercise-note-warning';
      advisor.append(warning);
    }
    warning.textContent = 'Uwaga: ' + constraint.reason + ' Nie zwiększaj ciężaru na podstawie tej sugestii.';
  } else {
    warning?.remove();
  }
}
function init() {
  if (window.__exerciseNotes180) return;
  window.__exerciseNotes180 = true;
  for (const name of ['renderToday','renderPlanWorkout']) wrapRender(name,refreshNotes);
  wrapRender('renderHistory',decorateHistory);
  for (const id of ['today','planWorkout']) {
    const root = document.getElementById(id);
    root?.addEventListener('input',onNoteChange);
    root?.addEventListener('change',onNoteChange);
  }
  refreshNotes();
  decorateHistory();
}
if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
