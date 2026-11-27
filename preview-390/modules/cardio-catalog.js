// Shared cardio exercise definitions. No storage writes or workout UI coupling.
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MojaCardioCatalog = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createCardioCatalog() {
  'use strict';
  const definitions = [
    ['treadmill-walk', 'Bieżnia – marsz', 'Bieżnia', ['distanceMeters', 'speedKmh', 'inclinePercent']],
    ['treadmill-run', 'Bieżnia – bieganie', 'Bieżnia', ['distanceMeters', 'speedKmh', 'inclinePercent']],
    ['bike', 'Rower stacjonarny', 'Rower stacjonarny', ['distanceMeters', 'speedKmh']],
    ['stairmaster', 'Schody – StairMaster', 'Schody', ['floors']],
    ['elliptical', 'Orbitrek', 'Orbitrek', ['distanceMeters']],
    ['rowing', 'Wioślarz', 'Ergometr wioślarski', ['distanceMeters', 'paceSecondsPer500m']]
  ];
  const exercises = Object.freeze(definitions.map(([key, name, equipment, metrics]) => Object.freeze({
    id: 'cardio-' + key, name, equipment, group: 'Kardio', measurementType: 'cardio',
    imagePath: './assets/cardio/cardio-' + key + '.webp',
    metrics: Object.freeze(['durationSeconds', ...metrics, 'rpe'])
  })));
  const byId = new Map(exercises.map(exercise => [exercise.id, exercise]));
  function getExercise(id) { return byId.get(id) || null; }
  function isCardio(exercise) {
    return !!exercise && (exercise.group === 'Kardio' || exercise.measurementType === 'cardio' || byId.has(exercise.id));
  }
  function resolveExercise(exercise) {
    if(!isCardio(exercise))return null;
    const canonical=byId.get(exercise.id);
    if(canonical)return canonical;
    return exercises.find(item=>item.name===exercise.name)||null;
  }
  // Repair only unused aliases; saved series and activities retain their original identifiers.
  function normalizeState(state) {
    const list=state.exercises;
    if(!Array.isArray(list))return false;
    const used=new Set([...(state.active||[]),...(state.activeCardio||[]),...(state.sessions||[]).flatMap(s=>[...(s.sets||[]),...(s.cardio||[])])].map(a=>a.exerciseId));
    const aliases=new Map();
    for(const ex of list){
      const canonical=resolveExercise(ex);
      if(canonical&&canonical.id!==ex.id&&!used.has(ex.id)&&state.cardioTimer?.exerciseId!==ex.id&&state.timedTimer?.exerciseId!==ex.id&&!Object.hasOwn(state.cardioDrafts||{},ex.id)){
        const wouldDuplicate=(state.plans||[]).some(p=>p.exerciseIds?.includes(ex.id)&&p.exerciseIds.includes(canonical.id));
        if(!wouldDuplicate&&!aliases.has(ex.id)&&![...aliases.values()].includes(canonical.id))aliases.set(ex.id,canonical.id);
      }
    }
    if(!aliases.size)return false;
    const map=id=>aliases.get(id)||id;
    state.exercises=list.filter(ex=>!aliases.has(ex.id));
    for(const plan of state.plans||[])if(Array.isArray(plan.exerciseIds))plan.exerciseIds=plan.exerciseIds.map(map);
    for(const key of ['manualExerciseIds','planExtraExerciseIds'])if(Array.isArray(state[key]))state[key]=[...new Set(state[key].map(map))];
    if(state.workoutSwaps)for(const key of Object.keys(state.workoutSwaps))state.workoutSwaps[key]=map(state.workoutSwaps[key]);
    return true;
  }
  function mergeExercises(existing) {
    if (!Array.isArray(existing)) throw new TypeError('Expected exercise array');
    const updated=existing.map(exercise=>{const canonical=byId.get(exercise?.id);return canonical?{...exercise,...canonical,metrics:[...canonical.metrics]}:exercise;});
    const existingIds = new Set(updated.map(exercise => exercise?.id));
    return [...updated, ...exercises.filter(exercise => !existingIds.has(exercise.id))
      .map(exercise => ({...exercise, metrics: [...exercise.metrics]}))];
  }
  return Object.freeze({ exercises, getExercise, isCardio, resolveExercise, normalizeState, mergeExercises });
});
