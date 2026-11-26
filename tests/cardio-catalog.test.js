const assert = require('node:assert/strict');
const catalog = require('../modules/cardio-catalog.js');
function runTests(catalog, assert) {
  assert(catalog.exercises.length === 6, 'Six exercises');
  assert(new Set(catalog.exercises.map(x=>x.id)).size===6, 'Unique stable ids');
  assert(catalog.exercises.every(x=>x.group==='Kardio'&&x.measurementType==='cardio'), 'Cardio category');
  assert(catalog.exercises.every(x=>x.metrics.includes('durationSeconds')&&x.metrics.includes('rpe')), 'Common fields');
  assert(catalog.exercises.every(x=>!x.metrics.some(m=>['heartRate','calories','resistance','weight','reps','rir'].includes(m))), 'Excluded fields');
  assert(catalog.getExercise('cardio-treadmill-walk').metrics.includes('inclinePercent'), 'Incline for walking');
  assert(catalog.getExercise('cardio-treadmill-run').metrics.includes('inclinePercent'), 'Incline for running');
  assert(catalog.getExercise('cardio-stairmaster').metrics.includes('floors'), 'Floors');
  assert(catalog.getExercise('cardio-rowing').metrics.includes('paceSecondsPer500m'), 'Rowing pace');
  assert(catalog.getExercise('cardio-bike').metrics.includes('speedKmh'), 'Bike speed');
  assert(catalog.exercises.every(x=>x.imagePath.endsWith(x.id+'.webp')), 'Asset mapping');
  const old=[{id:'seed-14',name:'Plank',measurementType:'duration'},{id:'custom-1',name:'My activity',group:'Kardio'}];
  const merged=catalog.mergeExercises(old);
  assert(merged.length===8&&old.length===2&&merged[0]===old[0]&&merged[1]===old[1], 'Preserve legacy data');
  assert(catalog.mergeExercises(merged).length===8, 'Idempotent merge');
  assert(!catalog.isCardio(old[0])&&catalog.isCardio(old[1])&&!catalog.resolveExercise(old[1]), 'Recognize legacy cardio without converting unknown exercise');
  assert(catalog.isCardio(merged[2])&&catalog.getExercise('unknown')===null, 'Lookup');
  merged[2].metrics.push('test');
  assert(!catalog.exercises[0].metrics.includes('test'), 'No mutation of definitions');
}
runTests(catalog, (value, message) => assert.ok(value, message));
console.log('Cardio catalog: all 16 assertions passed');
