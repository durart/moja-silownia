// Canonical identity mapping for the six approved catalog aliases.
export const EXERCISE_ALIASES = Object.freeze({
 'cali-02':'seed-13', 'cali-09':'seed-26', 'cali-10':'seed-27',
 'cali-11':'seed-67', 'cali-18':'seed-91', 'cali-19':'seed-89'
});
export function canonicalExerciseId(id) {
 return Object.hasOwn(EXERCISE_ALIASES,id) ? EXERCISE_ALIASES[id] : id;
}
// Preserve the original stored records. This projection is for catalog selection only.
export function projectCatalog(exercises) {
 if (!Array.isArray(exercises)) throw new TypeError('Expected exercise array');
 const ids = new Set(exercises.map(exercise => exercise.id));
 return exercises.filter(exercise => {
  const canonical = canonicalExerciseId(exercise.id);
  return canonical === exercise.id || !ids.has(canonical);
 }).map(exercise => {
  const aliases = exercises.filter(item => item.id !== exercise.id && canonicalExerciseId(item.id) === exercise.id);
  const groups = [...new Set([exercise.group, ...(exercise.groups || []), ...aliases.map(item => item.group)].filter(Boolean))];
  const metadata=aliases.find(item=>item.group==='Kalistenika');
  return {...exercise, groups, ...(metadata?{calisthenicsMetadata:{...metadata}}:{})};
 });
}
// Read-only history projection retains every set and its original identity.
export function projectHistorySets(sets, exerciseId) {
 if (!Array.isArray(sets)) throw new TypeError('Expected set array');
 const canonical = canonicalExerciseId(exerciseId);
 return sets.filter(set => canonicalExerciseId(set.exerciseId) === canonical)
  .map(set => ({...set, originalExerciseId: set.originalExerciseId ?? set.exerciseId, exerciseId: canonical}));
}

// Do not restore retired aliases after a successful migration.
export function mergeCatalogDefinitions(existing, definitions, migrated=false) {
 const result=[...existing];
 const ids=new Set(result.map(exercise=>exercise.id));
 for(const exercise of definitions){
  if(ids.has(exercise.id))continue;
  const canonical=canonicalExerciseId(exercise.id);
  if(migrated && canonical!==exercise.id && ids.has(canonical))continue;
  result.push(exercise);ids.add(exercise.id);
 }
 return result;
}
