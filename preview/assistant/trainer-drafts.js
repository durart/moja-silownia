/* Persisted, editable workout prescriptions. Never writes completed workout history. */
(function(root, factory) {
  const preparation = typeof module === 'object' && module.exports
    ? require('./trainer-preparation.js') : root.MojaTrainerPreparation;
  const explanation=typeof module==='object'&&module.exports?require('./adaptive-explanation.js'):root.MojaAdaptiveExplanation;
  const api = factory(preparation,explanation);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MojaTrainerDrafts = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(preparation,explanation) {
  'use strict';
  const VERSION = 1;
  const MAX_ROWS = 100;
  const validNumber = (value,min,max,integer=false) =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value));
  const blankRow = () => ({weight:null,reps:null,rir:null,targetRir:null,setType:'W',edited:false});
  const key = (id,slot) => Number.isInteger(slot) && slot >= 0 ? 'slot:'+slot : 'exercise:'+String(id);
  function normalizeRow(row) {
    if(row?.measurementType==='duration'||row?.durationSeconds!=null||row?.targetDurationSeconds!=null) return {
      measurementType:'duration',weight:validNumber(row?.weight,0,10000)?row.weight:null,
      durationSeconds:validNumber(row?.durationSeconds,1,86400,true)?row.durationSeconds:null,
      targetDurationSeconds:validNumber(row?.targetDurationSeconds,1,86400,true)?row.targetDurationSeconds:null,
      setType:row?.setType==='R'?'R':'W',edited:row?.edited===true
    };
    return {
      weight:validNumber(row?.weight,0,10000) ? row.weight : null,
      reps:validNumber(row?.reps,1,10000,true) ? row.reps : null,
      rir:validNumber(row?.rir,0,5,true) ? row.rir : null,
      targetRir:validNumber(row?.targetRir,0,5,true) ? row.targetRir : null,
      setType:row?.setType === 'R' ? 'R' : 'W',
      edited:row?.edited === true,
      ...(!row?.edited&&explanation?.normalize(row?.explanation)?{explanation:explanation.normalize(row.explanation)}:{})
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
  function assessmentPlan(state) {
    const plan=state.plans?.find(p=>p.id===state.activePlan);
    if(!Array.isArray(plan?.exerciseIds)) return null;
    return {...plan,exerciseIds:plan.exerciseIds.map((id,i)=>
      (state.hiddenWorkoutSlots||[]).includes(i)||(state.workoutSwaps?.[i]&&state.workoutSwaps[i]!==id)?null:id)};
  }
  function ensure(state,id,slot,target,completed=[]) {
    if (!active(state)) return {entry:null,changed:false};
    const existing=get(state,id,slot);
    const compatible=existing&&(existing.rows.every(r=>r?.measurementType==='duration')||!preparation.isTimedExercise(state.exercises?.find(e=>e.id===id)));
    if(compatible&&existing.mode!==(state.activeSessionMode||'standard'))return {entry:existing,changed:refreshMode(state,id,slot,target,completed)};
    const exercise=state.exercises?.find(e=>e.id===id);
    if (!exercise) return {entry:null,changed:false};
    const prepared=preparation.prepare({sessions:state.sessions,exercise,target,sessionMode:state.activeSessionMode,
      preWorkout:state.preWorkout,activeFlag:state.activeExerciseNotes?.[id]?.flag,planId:state.activePlan,slotIndex:slot,plan:assessmentPlan(state),adaptiveRecovery:state.preWorkout?.adaptiveRecovery===true});
    const prefs=settings(state);
    if(compatible){
      // Re-evaluate untouched suggestions; no history, completed set, or manual edit is rewritten.
      const rows=existing.rows.map((prior,i)=>{
        if(completed[i]||prior?.edited)return prior;
        const next=normalizeRow(prepared.rows[i]);
        if(!prefs.weights){next.weight=null;delete next.explanation;}
        if(!prefs.reps){if(next.measurementType==='duration')next.durationSeconds=null;else next.reps=null;delete next.explanation;}
        return next;
      });
      const updated={...existing,rows,reason:prepared.reason};
      if(prepared.advice)updated.advice=prepared.advice;else delete updated.advice;
      const changed=JSON.stringify(updated)!==JSON.stringify(existing);
      if(changed)state.trainerWorkout.entries[key(id,slot)]=updated;
      return {entry:changed?updated:existing,changed};
    }
    const legacyCount=Number.isInteger(Number(target?.sets))&&Number(target.sets)>0?Math.min(MAX_ROWS,Number(target.sets)):Number.isInteger(slot)?3:1;
    const count=Math.min(MAX_ROWS,Math.max(completed.length,existing?.rows.length||0,prefs.sets?prepared.rows.length:legacyCount));
    const rows=Array.from({length:count},(_,i)=>{
      const row=normalizeRow(prepared.rows[i]??(prepared.rows[0]?.measurementType==='duration'?prepared.rows.at(-1):undefined));
      if (!prefs.weights) {row.weight=null;delete row.explanation;}
      if (!prefs.reps) {delete row.explanation;if(row.measurementType==='duration')row.durationSeconds=null;else row.reps=null;}
      if (completed[i]) return {...normalizeRow(row.measurementType==='duration'?{...completed[i],measurementType:'duration'}:completed[i]),edited:true};
      if (existing?.rows[i]?.edited && row.measurementType==='duration') {
        const prior=existing.rows[i];return {...row,weight:validNumber(prior.weight,0,10000)?prior.weight:row.weight,
          ...(validNumber(prior.durationSeconds,1,86400,true)?{durationSeconds:prior.durationSeconds}:{}),edited:true};
      }
      return row;
    });
    const entry={exerciseId:id,reason:prepared.reason,...(prepared.advice ? {advice:prepared.advice} : {}),mode:state.activeSessionMode||'standard',rows};
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
    if (prior.measurementType==='duration'&&['reps','rir'].includes(field))return false;
    if (prior.measurementType!=='duration'&&field==='durationSeconds')return false;
    if (field==='setType') { if (!['W','R'].includes(value)) return false; }
    else if (value===''||value==null) value=null;
    else {
      if (typeof value==='string') value=Number(value);
      const limits=field==='weight'?[0,10000,false]:field==='reps'?[1,10000,true]:field==='durationSeconds'?[1,86400,true]:[0,5,true];
      if (!validNumber(value,...limits)) return false;
    }
    delete prior.explanation;entry.rows[index]={...prior,[field]:value,edited:true};return true;
  }
  function capture(state,id,slot,index,actual) {
    const entry=get(state,id,slot);
    if (!entry||!row(state,id,slot,index)) return false;
    const previous=row(state,id,slot,index);
    entry.rows[index]={...normalizeRow(previous.measurementType==='duration'?{...actual,measurementType:'duration'}:{...actual,targetRir:previous.targetRir}),edited:true};
    return true;
  }
  function append(state,id,slot,previous) {
    const entry=get(state,id,slot);
    if (!entry||entry.rows.length>=MAX_ROWS) return false;
    const tail=normalizeRow(entry.rows.at(-1));
    const last=normalizeRow(tail.measurementType==='duration'&&previous?.measurementType!=='duration'?tail:previous??tail);
    entry.rows.push(last.measurementType==='duration'?{...last,edited:true}:{...last,rir:null,edited:true});return true;
  }
  function removeRow(state,id,slot,index) {
    const entry=get(state,id,slot);
    if (!entry||!row(state,id,slot,index)) return false;
    entry.rows.splice(index,1);entry.manualSetCount=true;return true;
  }
  function refreshMode(state,id,slot,target,completed=[]) {
    const entry=get(state,id,slot);
    if (!entry||entry.mode===(state.activeSessionMode||'standard')) return false;
    const exercise=state.exercises?.find(e=>e.id===id);
    if (!exercise) return false;
    const prepared=preparation.prepare({sessions:state.sessions,exercise,target,sessionMode:state.activeSessionMode,
      preWorkout:state.preWorkout,activeFlag:state.activeExerciseNotes?.[id]?.flag,planId:state.activePlan,slotIndex:slot,plan:assessmentPlan(state),adaptiveRecovery:state.preWorkout?.adaptiveRecovery===true});
    const prefs=settings(state);
    const adaptiveResize=state.preWorkout?.adaptiveRecovery===true||entry.adaptiveResized===true;
    const desired=prefs.sets&&adaptiveResize&&!entry.manualSetCount?prepared.rows.length:entry.rows.length;
    if(desired!==entry.rows.length)entry.adaptiveResized=state.activeSessionMode==='recovery';
    const protectedCount=entry.rows.reduce((n,r,i)=>r?.edited||completed[i]?i+1:n,completed.length);
    const count=Math.min(MAX_ROWS,Math.max(desired,protectedCount));
    entry.rows=Array.from({length:count},(_,i)=>{
      const value=entry.rows[i];
      const prior=normalizeRow(value);
      if (completed[i]||prior.edited) return prior;
      if(!prepared.rows[i]&&value){return {...blankRow(),setType:prior.setType};}
      const next=normalizeRow(prepared.rows[i]??(prepared.rows[0]?.measurementType==='duration'?prepared.rows.at(-1):undefined));
      if (!prefs.weights) {next.weight=null;delete next.explanation;}
      if (!prefs.reps) {delete next.explanation;if(next.measurementType==='duration')next.durationSeconds=null;else next.reps=null;}
      return next;
    });
    entry.mode=state.activeSessionMode||'standard';entry.reason=prepared.reason;if(prepared.advice)entry.advice=prepared.advice;else delete entry.advice;return true;
  }
  return Object.freeze({active,initialize,clear,get,settings,ensure,removeExercise,row,change,capture,append,removeRow,refreshMode});
});
