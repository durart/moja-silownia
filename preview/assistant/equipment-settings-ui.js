/* Optional exercise-level equipment configuration; never rewrites workouts or plans. */
(function(root) {
'use strict';
const TYPES = [
  ['barbell', 'Sztanga'],
  ['dumbbell', 'Hantle'],
  ['machine_stack', 'Maszyna / stos'],
  ['cable_micro', 'Wyciąg z dokładką']
];
const LEGACY = { 'Sztanga': 'barbell', 'Hantle': 'dumbbell', 'Maszyna': 'machine_stack', 'Wyciąg': 'machine_stack' };
const validType = type => TYPES.some(([value]) => value === type);
const validStep = value => Number.isFinite(value) && value > 0 && value <= 20
  && Number.isInteger(Math.round(value * 100)) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

function decorate(card, exercise, refresh) {
  if (!exercise || !card || !root.MojaAdvisorProgression) return;
  if (exercise.equipment === 'Masa ciała') return;
  const details = document.createElement('details');
  details.className = 'advisor-equipment-config';
  const heading = document.createElement('summary');
  heading.textContent = 'Dostosuj sprzęt i skok ciężaru';
  details.append(heading);

  const form = document.createElement('form');
  form.style.marginTop = '10px';
  const typeLabel = document.createElement('label');
  typeLabel.textContent = 'Rodzaj sprzętu';
  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Rodzaj sprzętu dla ' + exercise.name);
  const savedType = validType(exercise.equipmentType) ? exercise.equipmentType : '';
  const inferred = LEGACY[exercise.equipment] || '';
  const options = [['', inferred ? 'Automatycznie: ' + TYPES.find(([t]) => t === inferred)[1] : 'Wybierz rodzaj sprzętu'], ...TYPES];
  for (const [value, label] of options) {
    const option = document.createElement('option');
    option.value = value; option.textContent = label; select.append(option);
  }
  select.value = savedType;
  typeLabel.append(select);
  form.append(typeLabel);

  const stepLabel = document.createElement('label');
  stepLabel.textContent = 'Minimalny rzeczywisty skok (kg)';
  const stepInput = document.createElement('input');
  stepInput.type = 'number';
  stepInput.min = '0.01';
  stepInput.max = '20';
  stepInput.step = '0.01';
  stepInput.inputMode = 'decimal';
  stepInput.placeholder = 'Domyślny dla sprzętu';
  stepInput.setAttribute('aria-label', 'Minimalny skok dla ' + exercise.name);
  if (exercise.equipmentStepKg != null) stepInput.value = String(exercise.equipmentStepKg);
  stepLabel.append(stepInput);
  form.append(stepLabel);

  const help = document.createElement('small');
  help.textContent = 'Przykład: jeśli stos zmienia obciążenie co 6 kg, wpisz 6. Ustawienia dotyczą tylko tego ćwiczenia; historia pozostaje bez zmian. Zmiana podczas treningu oznaczy sprzęt do ponownej weryfikacji.';
  form.append(help);

  const saveButton = document.createElement('button');
  saveButton.type = 'submit';
  saveButton.className = 'secondary';
  saveButton.textContent = 'Zapisz ustawienia sprzętu';
  form.append(saveButton);
  const feedback = document.createElement('small');
  feedback.setAttribute('role', 'status');
  form.append(feedback);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const chosenType = select.value;
    const resolvedType = chosenType || inferred;
    if (!validType(resolvedType)) {
      feedback.textContent = 'Wybierz rodzaj sprzętu dla tego ćwiczenia.';
      return;
    }
    const rawStep = stepInput.value.trim().replace(',', '.');
    const step = rawStep ? Number(rawStep) : null;
    if (step !== null && !validStep(step)) {
      feedback.textContent = 'Podaj skok od 0,01 do 20 kg, maksymalnie dwa miejsca po przecinku.';
      return;
    }
    if (typeof state === 'undefined' || !Array.isArray(state.exercises) || typeof save !== 'function') {
      feedback.textContent = 'Zapis ustawień jest chwilowo niedostępny.';
      return;
    }
    const original = state.exercises;
    const originalNotes=state.activeExerciseNotes;
    state.exercises = original.map(item => {
      if (String(item.id) !== String(exercise.id)) return item;
      const next = { ...item };
      if (chosenType) next.equipmentType = chosenType;
      else delete next.equipmentType;
      if (step !== null) next.equipmentStepKg = step;
      else delete next.equipmentStepKg;
      return next;
    });
    const nextExercise=state.exercises.find(item=>String(item.id)===String(exercise.id));
    const beforeExercise=original.find(item=>String(item.id)===String(exercise.id));
    const safety=root.MojaRecommendationSafety;
    if(state.startedAt&&safety&&safety.equipmentContext(beforeExercise)!==safety.equipmentContext(nextExercise)){
      const previousNote=originalNotes?.[exercise.id];
      if(!safety.flagNeedsReview(previousNote?.flag))state.activeExerciseNotes={...originalNotes,[exercise.id]:{...previousNote,text:previousNote?.text??'',flag:'equipment'}};
    }
    try {
      if (save() !== true) throw new Error('Storage rejected equipment changes');
      if (typeof refresh === 'function') refresh();
    } catch (error) {
      state.exercises = original;
      state.activeExerciseNotes=originalNotes;
      feedback.textContent = 'Nie udało się zapisać ustawień. Spróbuj ponownie.';
      console.warn('Exercise equipment configuration was not saved', error);
    }
  });
  details.append(form);
  card.append(details);
}

root.MojaAdvisorEquipmentUI = Object.freeze({ decorate, validStep });
})(typeof window !== 'undefined' ? window : globalThis);
