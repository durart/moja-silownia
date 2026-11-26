import {canonicalExerciseId,projectCatalog,EXERCISE_ALIASES} from './exercise-identity.mjs';

const own=(object,key)=>Object.hasOwn(object,key);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const mapIds=ids=>ids.map(canonicalExerciseId);

// Prepare a candidate without mutating or persisting the source.
export function prepareExerciseMigration(source) {
 if(!source || !['exercises','active','sessions'].every(key=>Array.isArray(source[key]))) throw new TypeError('Invalid workout state');
 const conflicts=[];
 if(source.active.length || source.activePlan!=null || source.startedAt || source.manualStarted || source.pendingWorkout || source.timedTimer || source.cardioTimer || source.activeCardio?.length || source.trainerWorkout) {
  return {status:'deferred',reason:'active-workout',state:source,conflicts};
 }
 const next=structuredClone(source);
 const ids=new Set(next.exercises.map(ex=>ex.id));
 const resolve=id=>ids.has(canonicalExerciseId(id))?canonicalExerciseId(id):id;
 function mapRecord(record,path) {
  if(record==null)return record;
  if(typeof record!=='object'||Array.isArray(record))throw new TypeError('Invalid keyed record: '+path);
  const result={...record};
  for(const [alias,id] of Object.entries(EXERCISE_ALIASES)){
   if(!own(record,alias)||resolve(alias)!==id)continue;
   if(own(record,id)&&!equal(record[id],record[alias])){
    conflicts.push({path,alias,id});continue;
   }
   result[id]=record[alias];delete result[alias];
  }
  return result;
 }
 next.exercises=projectCatalog(next.exercises);
 for(const session of next.sessions){
  if(!Array.isArray(session.sets))throw new TypeError('Invalid session sets');
  session.sets=session.sets.map(set=>{
   const id=resolve(set.exerciseId);
   return id===set.exerciseId?set:{...set,originalExerciseId:set.originalExerciseId??set.exerciseId,exerciseId:id};
  });
  if(session.exerciseNotes!=null)session.exerciseNotes=mapRecord(session.exerciseNotes,'session:'+session.id+':exerciseNotes');
 }
 for(const plan of next.plans||[]){
  if(!Array.isArray(plan.exerciseIds))throw new TypeError('Invalid plan exercise IDs');
  plan.exerciseIds=plan.exerciseIds.map(resolve);
 }
 for(const key of ['restSettings','activeExerciseNotes'])if(next[key]!=null)next[key]=mapRecord(next[key],key);
 for(const key of ['manualExerciseIds','planExtraExerciseIds'])if(Array.isArray(next[key]))next[key]=next[key].map(resolve);
 if(next.workoutSwaps)for(const key of Object.keys(next.workoutSwaps))next.workoutSwaps[key]=resolve(next.workoutSwaps[key]);
 if(conflicts.length)return {status:'conflict',state:source,conflicts};
 next.exerciseIdentityVersion=1;
 return {status:equal(source,next)?'unchanged':'ready',state:next,conflicts};
}

// A verified independent snapshot is mandatory before replacing persisted state.
export function persistExerciseMigration(storage,key,source) {
 const candidate=prepareExerciseMigration(source);
 if(candidate.status!=='ready')return candidate;
 const previous=storage.getItem(key);
 if(previous===null || !equal(JSON.parse(previous),source))throw new Error('Stored state differs from migration source');
 const backupKey=key+'-before-exercise-identity-v1';
 if(storage.getItem(backupKey)===null)storage.setItem(backupKey,previous);
 if(storage.getItem(backupKey)!==previous)throw new Error('Migration backup could not be verified');
 storage.setItem(key,JSON.stringify(candidate.state));
 return candidate;
}
