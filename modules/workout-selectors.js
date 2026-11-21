// Pure workout selectors. No DOM, localStorage or mutation of workout state.
export function selectLastSets(sessions,exerciseId){
 for(const session of sessions){const rows=session.sets.filter(row=>row.exerciseId===exerciseId);if(rows.length)return rows}
 return [];
}
export function normalizeExtraExerciseIds(raw,exercises){
 if(!Array.isArray(raw))return [];
 const valid=new Set(exercises.map(exercise=>exercise.id));
 return [...new Set(raw.filter(id=>typeof id==='string'&&valid.has(id)))];
}
export function selectEffectivePlanExerciseIds(plan,hiddenWorkoutSlots,workoutSwaps){
 return Array.isArray(plan?.exerciseIds)?plan.exerciseIds.map((id,i)=>(hiddenWorkoutSlots||[]).includes(i)?null:(workoutSwaps?.[i]||id)):[];
}
export function selectPlanExtraStatus(id,plan,exercises,effectiveIds,extraIds){
 if(!plan)return 'no-plan';
 if(!exercises.some(exercise=>exercise.id===id))return 'missing-exercise';
 if(effectiveIds.includes(id))return 'in-plan';
 if(extraIds.includes(id))return 'already-added';
 return 'ok';
}
