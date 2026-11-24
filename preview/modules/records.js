// Pure records engine. Legacy sets without setType are working sets.
export const isWorkingSet = set => set?.setType !== 'R' && set?.type !== 'warmup';
export function detectRecords({exerciseId,weight,reps,completedSessions=[],activeSets=[],exclude=null}){
 const prior=[...completedSessions.flatMap(s=>Array.isArray(s?.sets)?s.sets:[]),...activeSets]
  .filter(s=>s&&s.exerciseId===exerciseId&&s!==exclude&&isWorkingSet(s));
 if(!prior.length)return [];
 const w=Number(weight),r=Number(reps);
 if(!Number.isFinite(w)||w<0||!Number.isInteger(r)||r<1)return [];
 const flags=[];
 if(w>Math.max(...prior.map(s=>Number(s.weight)||0)))flags.push('Ciężar');
 const same=prior.filter(s=>Number(s.weight)===w);
 if(same.length&&r>Math.max(0,...same.map(s=>Number(s.reps)||0)))flags.push('Powtórzenia');
 if(w*r>Math.max(...prior.map(s=>(Number(s.weight)||0)*(Number(s.reps)||0))))flags.push('Objętość');
 return flags;
}
