// Connect the shared timed exercise rules to active workout state and controls.
(function(root) {
  'use strict';
  const core = root.MojaTimedExercise, ui = root.MojaTimedWorkoutUI;
  const secondsValid = value => Number.isInteger(value) && value >= 1 && value <= 86400;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[c]);
  const isTimed = id => core.measurementType(state.exercises.find(e => e.id === id)) === 'duration';
  const currentTimer = () => ui.activeTimer(state.timedTimer, state.startedAt);
  function busy() {
    if (!currentTimer()) return false;
    note('Najpierw zatrzymaj stoper ćwiczenia.');
    return true;
  }

  function fallbackDraft(context) {
    const drafts = state.timedRowDrafts;
    const value = drafts?.workoutId === context.workoutId && Object.hasOwn(drafts.values || {}, context.rowKey)
      ? drafts.values[context.rowKey] : null;
    return value?.exerciseId === context.exerciseId ? value : null;
  }
  function rememberDuration(context, value) {
    if (root.MojaTrainerDrafts?.change(state, context.exerciseId, context.slot, context.index, 'durationSeconds', value))
      return;
    if (state.timedRowDrafts?.workoutId !== context.workoutId)
      state.timedRowDrafts = { workoutId: context.workoutId, values: {} };
    state.timedRowDrafts.values[context.rowKey] = {
      exerciseId: context.exerciseId, durationSeconds: value === '' ? null : Number(value)
    };
  }
  function clearFallback(context) {
    if (fallbackDraft(context)) delete state.timedRowDrafts.values[context.rowKey];
  }
  function clearDrafts() {
    delete state.timedTimer;
    delete state.timedRowDrafts;
  }

  function targetSeconds(target, setTarget, draft, previous) {
    if (secondsValid(draft?.targetDurationSeconds)) return draft.targetDurationSeconds;
    return core.parseDurationTarget(setTarget?.reps)?.minSeconds ??
      (secondsValid(setTarget?.durationSeconds)?setTarget.durationSeconds:null) ??
      core.parseDurationTarget(target?.reps)?.minSeconds ??
      (secondsValid(target?.durationSeconds)?target.durationSeconds:null) ??
      (core.isTimedSet(previous) ? previous.durationSeconds : 30);
  }
  function renderRow({ id, slot = null, index, entry, draft, previous, target, setTarget, next }) {
    const rowKey = Number.isInteger(slot) ? 'r_' + slot + '_' + index : 'm_' + id + '_' + index;
    const context = { workoutId: state.startedAt, exerciseId: id, rowKey };
    const fallback = fallbackDraft(context);
    const goal = targetSeconds(target, setTarget, draft, previous);
    const weight = entry?.weight ?? draft?.weight ?? setTarget?.weight ?? target?.weight ?? previous?.weight ?? 0;
    const value = fallback ? fallback.durationSeconds : draft?.durationSeconds;
    const classes = 'set-grid hevy-set timed-set ' + (entry ? 'hevy-done' : next ? 'sport-next-set' : '');
    return '<div class="' + classes + '" data-timed-key="' + escape(rowKey) + '" data-timed-id="' +
      escape(id) + '" data-timed-index="' + index + '" data-timed-slot="' + (slot ?? '') +
      '" data-timed-target="' + goal + '">' +
      '<span>' + (entry?.pr?.length ? '🏅' : index + 1) + '</span>' +
      '<span class="previous">' + escape(ui.previousLabel(previous)) + '</span>' +
      '<label class="sport-set-field sport-weight"><span class="sport-field-caption">DOD. CIĘŻAR (KG)</span>' +
      '<input id="' + escape(rowKey) + '_w" type="number" min="0" step="0.5" inputmode="decimal" aria-label="Dodatkowy ciężar w kg" value="' +
      escape(weight === '' ? 0 : weight) + '"' + (entry ? ' readonly' : '') + '></label>' +
      ui.renderDurationField({ ...context, entry, draftSeconds: value, previous, targetSeconds: goal,
        timer: state.timedTimer, now: Date.now() }) +
      setTypePicker(rowKey, entry?.setType ?? draft?.setType ?? 'W') +
      '<button type="button" class="timed-save' + (entry ? ' done' : '') + '" data-timed-action="commit" aria-label="' +
      (entry ? 'Cofnij wykonanie serii' : 'Zapisz wykonaną serię') + '">' + (entry ? '✓' : '+') + '</button>' +
      '<button type="button" class="danger timed-remove" data-timed-action="remove" aria-label="Usuń serię">×</button>' +
      '</div>';
  }

  function contextFor(row) {
    if (!row || !state.startedAt || (!state.activePlan && !state.manualStarted)) return null;
    const { timedId: id, timedKey: rowKey, timedIndex, timedSlot } = row.dataset;
    const index = Number(timedIndex), slot = timedSlot === '' ? null : Number(timedSlot);
    if (!isTimed(id) || !Number.isInteger(index) || index < 0) return null;
    if (slot !== null) {
      if (!Number.isInteger(slot) || rowKey !== 'r_' + slot + '_' + index || !planSlot(id, slot).valid) return null;
    } else if (rowKey !== 'm_' + id + '_' + index ||
      (state.activePlan ? !isPlanExtraExercise(id) : !manualIds().includes(id))) return null;
    return { workoutId: state.startedAt, exerciseId: id, rowKey, slot, index };
  }
  function completed(context) {
    return Number.isInteger(context.slot)
      ? planSets(context.exerciseId, context.slot)[context.index]
      : manualSetRows(context.exerciseId)[context.index];
  }
  function rerender() {
    if (state.activePlan) renderPlanWorkout(); else renderToday();
    tick();
  }
  function saveRow(id, index, slot) {
    const rowKey = Number.isInteger(slot) ? 'r_' + slot + '_' + index : 'm_' + id + '_' + index;
    const input = document.getElementById(rowKey + '_duration');
    const row = input?.closest('.timed-set');
    const context = contextFor(row);
    if (!context || completed(context) || busy()) return;
    const weightInput = document.getElementById(rowKey + '_w');
    const seconds = Number(input.value), weight = Number(weightInput?.value);
    if (!secondsValid(seconds) || !weightInput || weightInput.value === '' ||
      !Number.isFinite(weight) || weight < 0) {
      note('Podaj prawidłowy czas serii (w sekundach) i dodatkowy ciężar.'); return;
    }
    const exercise = state.exercises.find(e => e.id === id);
    const goal = Number(row.dataset.timedTarget);
    const workingRows = Array.from(row.closest('.exercise-card')?.querySelectorAll(':scope > .timed-set')||[])
      .filter(node=>readSetType(node.dataset.timedKey)!=='R').length;
    const planTarget = Number.isInteger(slot)?planSlot(id,slot).plan?.targets?.[slot]:null;
    const plannedCount=Number(planTarget?.sets);
    const plannedWarmups=(planTarget?.setDetails||[]).filter(x=>x?.setType==='R'||x?.type==='warmup'||x?.type==='R').length;
    const targetSetCount=Math.max(1,workingRows,Number.isInteger(plannedCount)&&plannedCount<=100?plannedCount-plannedWarmups:0);
    const fields = { exerciseId: id, name: exercise.name, weight, setType: readSetType(rowKey),targetSetCount,
      at: new Date().toISOString(), pr: core.detectDurationRecord({exerciseId:id,weight,durationSeconds:seconds,
        completedSessions:state.sessions,activeSets:state.active,sessionMode:state.activeSessionMode,setType:readSetType(rowKey)}),
      ...(secondsValid(goal) ? { targetDurationSeconds: goal } : {}),
      ...(Number.isInteger(slot) ? { planId: state.activePlan, planSlotIndex: slot, planSetIndex: index }
        : { manualSetIndex: index }) };
    const snapshot = structuredClone(state), previousManual = { ...manualDrafts };
    state.active.push(core.createTimedSet(fields, seconds));
    if (slot === null) manualDrafts[id] = Math.max(0, (manualDrafts[id] || 1) - 1);
    clearFallback(context);
    if (!save()) {
      state = snapshot; manualDrafts = previousManual;
      note('Nie zapisano serii. Wpisane dane pozostają na ekranie.'); return;
    }
    delete planUndoDrafts[rowKey]; delete planExtraInputDrafts[rowKey];
    startRest(id); rerender(); note('✓ Seria czasowa zapisana');
  }

  function updateTimers() {
    const timer = currentTimer();
    for (const box of document.querySelectorAll('.timed-stopwatch')) {
      const row = box.closest('.timed-set'), context = contextFor(row);
      if (!context) continue;
      const own = ui.sameRow(timer, context);
      const clock = box.querySelector('[data-timed-clock]');
      const action = box.querySelector('button[data-timed-action]');
      const time = ui.formatElapsed(own ? core.elapsedSeconds(timer.startedAt, Date.now()) : 0);
      if (clock.textContent !== time) clock.textContent = time;
      const nextAction = own ? 'stop' : 'start';
      if (action.dataset.timedAction !== nextAction) action.dataset.timedAction = nextAction;
      const label = own ? 'Zatrzymaj' : 'Uruchom stoper';
      if (action.textContent !== label) action.textContent = label;
      action.disabled = !!timer && !own;
    }
  }
  function onClick(event) {
    const button = event.target.closest('button[data-timed-action]');
    const row = button?.closest('.timed-set'), context = contextFor(row);
    if (!context) return;
    const { exerciseId: id, index, slot, rowKey } = context;
    const action = button.dataset.timedAction;
    if (action === 'commit') {
      if (Number.isInteger(slot)) togglePlanRow(id,index,rowKey,slot);
      else toggleManualRow(id,index);
      return;
    }
    if (action === 'remove') {
      if (Number.isInteger(slot)) deletePlanRow(id,index,slot);
      else removeManualRow(id,index);
      return;
    }
    if (completed(context)) return;
    const snapshot = structuredClone(state);
    if (action === 'start') {
      if(root.MojaCardioWorkout?.busy())return;
      const result = ui.startTimer(state.timedTimer,context,Date.now());
      if (result.status !== 'started') return;
      state.timedTimer = result.timer;
      if (!save()) { state = snapshot; return; }
      updateTimers();
    } else if (action === 'stop') {
      const result = ui.stopTimer(state.timedTimer,context,Date.now());
      if (result.status !== 'stopped') { note('Stoper musi działać co najmniej sekundę.'); return; }
      const input = document.getElementById(rowKey + '_duration');
      if (!input) return;
      state.timedTimer = null;
      rememberDuration(context,result.durationSeconds);
      if (!save()) { state = snapshot; return; }
      input.value = String(result.durationSeconds);
      updateTimers();
      note('Czas zmierzony. Zatwierdź serię, aby rozpocząć przerwę.');
    }
  }
  function onInput(event) {
    if (!event.target.matches('input[id$="_duration"]')) return;
    const context = contextFor(event.target.closest('.timed-set'));
    if (!context || completed(context)) return;
    const value = event.target.value;
    if (value !== '' && !secondsValid(Number(value))) return;
    rememberDuration(context,value);
    save();
  }
  document.addEventListener('click', onClick);
  document.addEventListener('change', onInput);
  root.MojaTimedWorkout = Object.freeze({ isTimed, busy, renderRow, saveRow, updateTimers, clearDrafts });
})(window);
