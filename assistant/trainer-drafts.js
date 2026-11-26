/* Persisted, editable workout prescriptions. Never writes completed workout history. */
(function(root, factory) {
  const preparation = typeof module === 'object' && module.exports
    ? require('./trainer-preparation.js') : root.MojaTrainerPreparation;
  const api = factory(preparation);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MojaTrainerDrafts = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(preparation) {
  'use strict';
  const VERSION = 1;
  const MAX_ROWS = 100;
  const validNumber = (value,min,max,integer=false) =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value));
  const blankRow = () => ({weight:null,reps:null,rir:null,targetRir:null,setType:'W',edited:false});
  const key = (id,slot) => Number.isInteger(slot) && slot >= 0 ? 'slot:'+slot : 'exercise:'+String(id);
  function normalizeRow(row) {
    return {
      weight:validNumber(row?.weight,0,10000) ? row.weight : null,
      reps:validNumber(row?.reps,1,10000,true) ? row.reps : null,
      rir:validNumber(row?.rir,0,5,true) ? row.rir : null,
      targetRir:validNumber(row?.targetRir,0,5,true) ? row.targetRir : null,
      setType:row?.setType === 'R' ? 'R' : 'W',
      ...(row && 'durationSeconds' in row ? {durationSeconds:validNumber(row.durationSeconds,1,86400,true) ? row.durationSeconds : null} : {}),
      ...(row && 'targetDurationSeconds' in row ? {targetDurationSeconds:validNumber(row.targetDurationSeconds,1,86400,true) ? row.targetDurationSeconds : null} : {}),
      edited:row?.edited === true
    };
  }
  function active(state) {
    const draft=state?.trainerWorkout;
    return !!state?.startedAt && draft?.version === VERSION && draft.startedAt === state.startedAt &&
      !!draft.entries && typeof draft.entries === 'object' && !Array.isArray(draft.entries);
  }
  function initialize(state) {
    if (!state.startedAt) return false;
    state.trainerWorkout = {version:VERSION,startedAt:state.startedAt,entries:{}};
    return true;
  }
  function clear(state) { delete state.trainerWorkout; }
  function get(state,id,slot) {
    if (!active(state)) return null;
    const entry=state.trainerWorkout.entries[key(id,slot)];
    if (entry?.exerciseId !== id || !Array.isArray(entry.rows) || entry.rows.length > MAX_ROWS) return null;
    return entry;
  }
  function settings(state) {
    const value=state?.trainerSettings;
    return {weights:value?.weights!==false,reps:value?.reps!==false,sets:value?.sets!==false,explanation:value?.explanation!==false};
  }
  function ensure(state,id,slot,target,completed=[]) {
    if (!active(state)) return {entry:null,changed:false};
    const existing=get(state,id,slot);
    if (existing) return {entry:existing,changed:false};
    const exercise=state.exercises?.find(e=>e.id===id);
    if (!exercise) return {entry:null,changed:false};
    const prepared=preparation.prepare({sessions:state.sessions,exercise,target,sessionMode:state.activeSessionMode,
      preWorkout:state.preWorkout,activeFlag:state.activeExerciseNotes?.[id]?.flag,planId:state.activePlan,slotIndex:slot});
    const prefs=settings(state);
    const legacyCount=Number.isInteger(Number(target?.sets))&&Number(target.sets)>0?Math.min(MAX_ROWS,Number(target.sets)):Number.isInteger(slot)?3:1;
    const count=Math.min(MAX_ROWS,Math.max(completed.length,prefs.sets?prepared.rows.length:legacyCount));
    const rows=Array.from({length:count},(_,i)=>{
      const row=normalizeRow(prepared.rows[i]);
      if (!prefs.weights) row.weight=null;
      if (!prefs.reps) row.reps=null;
      if (completed[i]) return {...normalizeRow(completed[i]),edited:true};
      return row;
    });
    const entry={exerciseId:id,reason:prepared.reason,mode:state.activeSessionMode||'standard',rows};
    state.trainerWorkout.entries[key(id,slot)]=entry;
    return {entry,changed:true};
  }
  function removeExercise(state,id,slot) {
    if (!get(state,id,slot)) return false;
    delete state.trainerWorkout.entries[key(id,slot)];return true;
  }
  function row(state,id,slot,index) {
    const entry=get(state,id,slot);
    return entry && Number.isInteger(index)&&index>=0&&index<entry.rows.length ? normalizeRow(entry.rows[index]) : null;
  }
  function change(state,id,slot,index,field,value) {
    const entry=get(state,id,slot);
    const prior=row(state,id,slot,index);
    if (!entry||!prior||!['weight','reps','rir','setType','durationSeconds'].includes(field)) return false;
    if (field==='setType') { if (!['W','R'].includes(value)) return false; }
    else if (value===''||value==null) value=null;
    else {
      if (typeof value==='string') value=Number(value);
      const limits=field==='weight'?[0,10000,false]:field==='reps'?[1,10000,true]:field==='durationSeconds'?[1,86400,true]:[0,5,true];
      if (!validNumber(value,...limits)) return false;
    }
    entry.rows[index]={...prior,[field]:value,edited:true};return true;
  }
  function capture(state,id,slot,index,actual) {
    const entry=get(state,id,slot);
    if (!entry||!row(state,id,slot,index)) return false;
    entry.rows[index]={...normalizeRow({...actual,targetRir:entry.rows[index]?.targetRir}),edited:true};
    return true;
  }
  function append(state,id,slot,previous) {
    const entry=get(state,id,slot);
    if (!entry||entry.rows.length>=MAX_ROWS) return false;
    const last=normalizeRow(previous??entry.rows.at(-1));
    entry.rows.push({...last,rir:null,edited:true});return true;
  }
  function removeRow(state,id,slot,index) {
    const entry=get(state,id,slot);
    if (!entry||!row(state,id,slot,index)) return false;
    entry.rows.splice(index,1);return true;
  }
  function refreshMode(state,id,slot,target,completed=[]) {
    const entry=get(state,id,slot);
    if (!entry||entry.mode===state.activeSessionMode) return false;
    const exercise=state.exercises?.find(e=>e.id===id);
    if (!exercise) return false;
    const prepared=preparation.prepare({sessions:state.sessions,exercise,target,sessionMode:state.activeSessionMode,
      preWorkout:state.preWorkout,activeFlag:state.activeExerciseNotes?.[id]?.flag,planId:state.activePlan,slotIndex:slot});
    const prefs=settings(state);
    entry.rows=entry.rows.map((value,i)=>{
      const prior=normalizeRow(value);
      if (completed[i]||prior.edited) return prior;
      const next=normalizeRow(prepared.rows[i]);
      if (!prefs.weights) next.weight=null;
      if (!prefs.reps) next.reps=null;
      return next;
    });
    entry.mode=state.activeSessionMode;entry.reason=prepared.reason;return true;
  }
  return Object.freeze({active,initialize,clear,get,settings,ensure,removeExercise,row,change,capture,append,removeRow,refreshMode});
});
