/* Standalone preview data. Uses the preview-only storage key declared in preview/index.html. */
(function() {
  'use strict';
  const names = [
    ['Wyciskanie sztangi na ławce płaskiej', [[60,15],[70,12],[75,10],[75,9]], 0],
    ['Ściąganie drążka do klatki nachwytem', [[45,12],[55,12],[57,10]], 1],
    ['Wiosłowanie siedząc szerokim uchwytem', [[55,12],[60,12],[60,10]], 2],
    ['Wznosy bokiem z hantlami', [[10,12],[12,12],[12,10]], 3],
    ['Uginanie ramion ze sztangą łamaną', [[28,12],[30,12]], 4]
  ];
  window.showSportDemo = function showSportDemo() {
    if (typeof state === 'undefined' || !Array.isArray(state.sessions)) {
      alert('Nie udało się załadować testowego dziennika. Odśwież stronę.');
      return;
    }
    let session = state.sessions.find(s => s && s.sportPreviewDemo === true);
    if (!session) {
      const sets = [];
      for (const [name, values, planSlotIndex] of names) {
        const exercise = state.exercises.find(e => e.name === name);
        if (!exercise) continue;
        values.forEach(([weight, reps], planSetIndex) => sets.push({
          exerciseId: exercise.id, name: exercise.name, weight, reps, rir: planSetIndex === 0 ? 3 : 2,
          planSlotIndex, planSetIndex, at: new Date().toISOString(),
          pr: (planSlotIndex === 0 && planSetIndex === 2) || (planSlotIndex === 1 && planSetIndex === 2)
            ? ['Ciężar'] : []
        }));
      }
      if (!sets.length) {
        alert('Nie znaleziono ćwiczeń do demonstracji.');
        return;
      }
      session = {
        id: Date.now(), date: new Date().toISOString(),
        planName: 'Trening A — DEMO', sportPreviewDemo: true,
        durationSeconds: 3504, sets, preWorkout: null
      };
      session.calories = estimateCalories(session);
      session.muscles = muscleLoads(session);
      session.fatigueImpulse = muscleFatigueImpulse(session);
      session.fatigueModel = 2;
      state.sessions.unshift(session);
      save(); // preview-only localStorage
    }
    if (!window.openSportSummary || !window.openSportSummary(session.id)) {
      alert('Nie udało się otworzyć podsumowania. Odśwież stronę.');
    }
  };
})();
