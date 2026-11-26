// Cardio and mixed-workout energy estimation, independent of UI and persistence.
(function(root,factory){const node=typeof module==='object'&&module.exports;const api=factory(node?require('./cardio-core.js'):root.MojaCardioCore);if(node)module.exports=api;if(root)root.MojaCardioEnergy=api;})(typeof globalThis!=='undefined'?globalThis:this,function makeEnergy(core) {
  'use strict';
  // Reference METs: 2024 Adult Compendium, bicycling and conditioning exercise.
  // https://pacompendium.com/bicycling/ ; https://pacompendium.com/conditioning-exercise/
  // RPE bands are conservative product heuristics, not a validated RPE-to-MET conversion.
  const profiles=Object.freeze({
    'cardio-treadmill-walk':[2.8,3.8,5.5],
    'cardio-treadmill-run':[6,8.5,10.5],
    'cardio-bike':[4,6.8,8],
    'cardio-stairmaster':[5.5,9.3,9.3],
    'cardio-elliptical':[3.5,5,9],
    'cardio-rowing':[3.5,5,7.3]
  });
  const bounded=(n,min,max)=>Math.max(min,Math.min(max,n));
  const validWeight=w=>typeof w==='number'&&Number.isFinite(w)&&w>=20&&w<=350;
  const isWalk=id=>id==='cardio-treadmill-walk';
  const isRun=id=>id==='cardio-treadmill-run';
  function activityMet(activity) {
    const profile=profiles[activity?.exerciseId];
    if(!profile||!core.validMetric('durationSeconds',activity.durationSeconds))throw new RangeError('Invalid cardio activity');
    const treadmill=isWalk(activity.exerciseId)||isRun(activity.exerciseId);
    const speed=activity.speedKmh,grade=activity.inclinePercent;
    // ACSM treadmill oxygen-cost equations, within a conservative application domain.
    // https://pmc.ncbi.nlm.nih.gov/articles/PMC7896743/
    // https://pmc.ncbi.nlm.nih.gov/articles/PMC12419060/
    if(treadmill&&core.validMetric('speedKmh',speed)&&core.validMetric('inclinePercent',grade)&&grade>=0&&grade<=15){
      const v=speed*1000/60,g=grade/100,walk=isWalk(activity.exerciseId);
      if((walk&&v>=50&&v<=100+1e-8)||(!walk&&v>=134&&v<=350)){
        const oxygen=3.5+(walk?0.1:0.2)*v+(walk?1.8:0.9)*v*g;
        return {met:oxygen/3.5,method:'acsm',assumedIntensity:false};
      }
    }
    const rpe=core.validMetric('rpe',activity.rpe)?activity.rpe:null;
    return {met:profile[rpe===null?1:rpe<=3?0:rpe>=7?2:1],method:'reference-met',assumedIntensity:rpe===null};
  }
  function strengthMet(seconds,count){
    const minutes=seconds/60;
    const density=count/Math.max(minutes,1)*60;
    return bounded(2.5+Math.min(2.5,density/15),2.5,5);
  }
  function raw(met,seconds,weight){
    // Keep the existing application's approximate 1 MET = 1 kcal/kg/hour convention.
    const factor=weight*seconds/3600;
    return {total:met*factor,active:Math.max(0,met-1)*factor};
  }
  function roundEnergy(e){return {total:Math.round(e.total),active:Math.round(e.active)};}
  function estimate(session,weight){
    if(!validWeight(weight))throw new RangeError('Invalid body weight');
    const activities=Array.isArray(session?.cardio)?session.cardio:[];
    const sets=Array.isArray(session?.sets)?session.sets:[];
    const elapsed=typeof session?.durationSeconds==='number'&&Number.isFinite(session.durationSeconds)?Math.max(0,session.durationSeconds):0;
    if(!activities.length){
      if(!elapsed)return {total:0,active:0,met:0};
      const met=strengthMet(elapsed,sets.length);
      return {...roundEnergy(raw(met,elapsed,weight)),met:Math.round(met*10)/10};
    }
    core.validateActivities(activities);
    let cardioSeconds=0,cardioTotal=0,cardioActive=0,metSeconds=0;
    const details=activities.map(a=>{
      const model=activityMet(a),energy=raw(model.met,a.durationSeconds,weight);
      cardioSeconds+=a.durationSeconds;cardioTotal+=energy.total;cardioActive+=energy.active;metSeconds+=model.met*a.durationSeconds;
      return {activityId:a.id,durationSeconds:a.durationSeconds,method:model.method,assumedIntensity:model.assumedIntensity,met:Math.round(model.met*10)/10,...roundEnergy(energy)};
    });
    const effectiveSeconds=Math.max(elapsed,cardioSeconds);
    const remainingSeconds=effectiveSeconds-cardioSeconds;
    const strengthSeconds=sets.length?remainingSeconds:0;
    const idleSeconds=sets.length?0:remainingSeconds;
    const smet=strengthSeconds?strengthMet(strengthSeconds,sets.length):0;
    const strength=raw(smet,strengthSeconds,weight),idle=raw(1,idleSeconds,weight);
    const total=cardioTotal+strength.total+idle.total,active=cardioActive+strength.active;
    return {...roundEnergy({total,active}),met:effectiveSeconds?Math.round((metSeconds+smet*strengthSeconds+idleSeconds)/effectiveSeconds*10)/10:0,
      model:'mixed-cardio-v1',cardio:{durationSeconds:cardioSeconds,...roundEnergy({total:cardioTotal,active:cardioActive}),details},
      strength:{durationSeconds:strengthSeconds,...roundEnergy(strength)},idle:{durationSeconds:idleSeconds,...roundEnergy(idle)},
      effectiveSeconds, durationAdjusted:cardioSeconds>elapsed, strengthDurationUnknown:sets.length>0&&cardioSeconds>=elapsed};
  }
  return Object.freeze({activityMet,estimate});
});
