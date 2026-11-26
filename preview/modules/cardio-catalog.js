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
    return !!exercise && (exercise.measurementType === 'cardio' || byId.has(exercise.id));
  }
  function mergeExercises(existing) {
    if (!Array.isArray(existing)) throw new TypeError('Expected exercise array');
    const existingIds = new Set(existing.map(exercise => exercise?.id));
    return [...existing, ...exercises.filter(exercise => !existingIds.has(exercise.id))
      .map(exercise => ({...exercise, metrics: [...exercise.metrics]}))];
  }
  return Object.freeze({ exercises, getExercise, isCardio, mergeExercises });
});
