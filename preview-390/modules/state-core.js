// Pure state initialization and workout recovery helpers; no localStorage or DOM.
export function validState(v){return globalThis.MojaStorageRecovery.validState(v)}
export function readState(raw){return globalThis.MojaStorageRecovery.readState(raw)}
export function selectInitialState(primaryRaw,backupRaw,seeds){
 const primary=readState(primaryRaw);
 if(primary)return {state:primary,source:'primary',unreadable:null};
 const backup=readState(backupRaw);
 return {state:backup||{exercises:seeds,active:[],sessions:[]},source:backup?'backup':'new',unreadable:primaryRaw||null};
}
export function normalizeBaseState(state){
 if(!Array.isArray(state.plans))state.plans=[];
 if(!('activePlan' in state))state.activePlan=null;
 state.restSettings??={};state.startedAt??=null;state.restUntil??=null;
 state.bodyWeight??=100.6;state.preWorkout??=null;state.pendingWorkout??=null;
 state.workoutSwaps??={};state.planRowCounts??={};state.hiddenWorkoutSlots??=[];
 return state;
}
export function recoverActiveState(state){
 if(!Array.isArray(state.active)||!state.active.length)return {changed:false,detachExtras:false};
 if(state.plans?.some(p=>p.id===state.activePlan))return {changed:false,detachExtras:false};
 let changed=false,detachExtras=false;
 if(state.activePlan!=null){
  detachExtras=true;state.activePlan=null;state.workoutSwaps={};state.planRowCounts={};changed=true;
 }
 if(!state.manualStarted){state.manualStarted=true;changed=true}
 if(!Array.isArray(state.manualExerciseIds)){state.manualExerciseIds=[];changed=true}
 for(const set of state.active){
  if(!set.exerciseId)continue;
  if(!state.manualExerciseIds.includes(set.exerciseId)){state.manualExerciseIds.push(set.exerciseId);changed=true}
 }
 if(!state.startedAt){
  const dates=state.active.map(s=>Date.parse(s.at)).filter(Number.isFinite);
  state.startedAt=new Date(dates.length?Math.min(...dates):Date.now()).toISOString();changed=true;
 }
 return {changed,detachExtras};
}
