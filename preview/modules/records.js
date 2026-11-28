// Read-only strength records. History is preserved even when a row is ineligible.
import './set-observation.js';
const observation=globalThis.MojaSetObservation;
export const isWorkingSet=observation.isWorking;
export function detectRecords({exerciseId,weight,reps,completedSessions=[],activeSets=[],exclude=null,sessionMode='standard'}){
 if(sessionMode==='recovery'||observation.isAssistedLoad(exerciseId)||!observation.isReliable(exclude??{}))return [];
 const prior=[...completedSessions.filter(s=>s?.sessionMode!=='recovery').flatMap(s=>Array.isArray(s?.sets)?s.sets:[]),...activeSets]
  .filter(s=>s&&s.exerciseId===exerciseId&&s!==exclude&&observation.isTrustedWorking(s)&&observation.validRepetitions(s)&&!observation.isAssistedLoad(s));
 const w=observation.number(weight),r=observation.number(reps);
 if(!prior.length||w===null||w<0||!Number.isSafeInteger(r)||r<1)return [];
 const flags=[];
 if(w>Math.max(...prior.map(s=>Number(s.weight))))flags.push('Ciężar');
 const same=prior.filter(s=>Number(s.weight)===w);
 if(same.length&&r>Math.max(...same.map(s=>Number(s.reps))))flags.push('Powtórzenia');
 if(w*r>Math.max(...prior.map(s=>Number(s.weight)*Number(s.reps))))flags.push('Objętość');
 return flags;
}
