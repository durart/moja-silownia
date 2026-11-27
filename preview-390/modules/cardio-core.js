// Pure cardio records and persistent stopwatch transitions.
(function(root,factory){
  const catalog=typeof module==='object'&&module.exports?require('./cardio-catalog.js'):root.MojaCardioCatalog;
  const api=factory(catalog);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MojaCardioCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function cardioCore(catalog) {
  'use strict';
  const limits = Object.freeze({
    durationSeconds: [1, 86400, true],
    distanceMeters: [1, 1000000, false],
    speedKmh: [0.1, 150, false],
    inclinePercent: [-30, 50, false],
    floors: [1, 10000, true],
    paceSecondsPer500m: [1, 86400, false],
    rpe: [1, 10, true]
  });
  const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  function validMetric(key, value) {
    if (!has(limits,key)) return false;
    const [min,max,integer]=limits[key];
    return typeof value==='number' && Number.isFinite(value) && value>=min && value<=max && (!integer || Number.isInteger(value));
  }
  function createActivity(exerciseId, metrics, { id, at } = {}) {
    const exercise = catalog.getExercise(exerciseId);
    if (!exercise || typeof id !== 'string' || !id.trim() || typeof at !== 'string' || !Number.isFinite(Date.parse(at)))
      throw new TypeError('Invalid cardio activity identity');
    if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics) || !validMetric('durationSeconds', metrics.durationSeconds))
      throw new RangeError('Invalid cardio duration');
    const values = {};
    for (const [key,value] of Object.entries(metrics)) {
      if (!exercise.metrics.includes(key)) throw new RangeError('Unsupported cardio metric: '+key);
      if (value === null || value === undefined || value === '') continue;
      if (!validMetric(key,value)) throw new RangeError('Invalid cardio metric: '+key);
      values[key]=value;
    }
    const estimatedMetrics=[];
    if (exercise.metrics.includes('distanceMeters') && values.distanceMeters === undefined && values.speedKmh !== undefined) {
      const calculated=Math.round(values.speedKmh*values.durationSeconds/3.6);
      if (validMetric('distanceMeters',calculated)) {values.distanceMeters=calculated;estimatedMetrics.push('distanceMeters');}
    }
    if (exercise.metrics.includes('speedKmh') && values.speedKmh === undefined && values.distanceMeters !== undefined) {
      const calculated=Math.round(values.distanceMeters*3.6/values.durationSeconds*10)/10;
      if (validMetric('speedKmh',calculated)) {values.speedKmh=calculated;estimatedMetrics.push('speedKmh');}
    }
    if (exercise.metrics.includes('paceSecondsPer500m') && values.paceSecondsPer500m === undefined && values.distanceMeters !== undefined) {
      const calculated=Math.round(values.durationSeconds*500/values.distanceMeters);
      if (validMetric('paceSecondsPer500m',calculated)) {values.paceSecondsPer500m=calculated;estimatedMetrics.push('paceSecondsPer500m');}
    }
    return {id, exerciseId, measurementType:'cardio', at, ...values, estimatedMetrics};
  }
  function validateActivities(activities) {
    if (activities === undefined) return;
    if (!Array.isArray(activities)) throw new TypeError('Invalid cardio activity list');
    const ids=new Set();
    for (const activity of activities) {
      if (!activity || activity.measurementType !== 'cardio' || ids.has(activity.id)) throw new TypeError('Invalid or duplicate cardio activity');
      const {id,exerciseId,measurementType,at,estimatedMetrics=[],...metrics}=activity;
      createActivity(exerciseId,metrics,{id,at});
      if (!Array.isArray(estimatedMetrics) || new Set(estimatedMetrics).size!==estimatedMetrics.length ||
        estimatedMetrics.some(key=>!['distanceMeters','speedKmh','paceSecondsPer500m'].includes(key)||!has(metrics,key)))
        throw new TypeError('Invalid estimated metric markers');
      ids.add(id);
    }
  }
  function validateState(state) {
    validateActivities(state?.activeCardio);
    for(const session of state?.sessions || []) validateActivities(session?.cardio);
    return state;
  }
  function validTimestamp(value) { return Number.isSafeInteger(value) && value>=0; }
  function validateTimer(timer) {
    if (!timer || !catalog.getExercise(timer.exerciseId) || typeof timer.workoutId !== 'string' || !timer.workoutId ||
        typeof timer.activityId !== 'string' || !timer.activityId || !['running','paused'].includes(timer.status) ||
        !validTimestamp(timer.accumulatedMs) || timer.accumulatedMs>86400000 || !validTimestamp(timer.changedAt) ||
        (timer.status==='running' ? !validTimestamp(timer.startedAt)||timer.startedAt!==timer.changedAt : timer.startedAt!==null))
      throw new TypeError('Invalid cardio timer');
    return timer;
  }
  function startTimer({workoutId,activityId,exerciseId},now) {
    return validateTimer({workoutId,activityId,exerciseId,status:'running',accumulatedMs:0,startedAt:now,changedAt:now});
  }
  function elapsedMs(timer,now) {
    validateTimer(timer);
    if(!validTimestamp(now)||now<timer.changedAt) throw new RangeError('Invalid timer clock');
    const delta=timer.status==='running'?now-timer.startedAt:0;
    return Math.min(86400000,timer.accumulatedMs+delta);
  }
  function elapsedSeconds(timer,now) {return Math.floor(elapsedMs(timer,now)/1000);}
  function pauseTimer(timer,now) {
    if(timer.status!=='running') throw new Error('Timer is not running');
    return validateTimer({...timer,status:'paused',accumulatedMs:elapsedMs(timer,now),startedAt:null,changedAt:now});
  }
  function resumeTimer(timer,now) {
    validateTimer(timer);
    if(timer.status!=='paused'||!validTimestamp(now)||now<timer.changedAt) throw new Error('Timer cannot resume');
    return validateTimer({...timer,status:'running',startedAt:now,changedAt:now});
  }
  function stopTimer(timer,now) {
    const seconds=elapsedSeconds(timer,now);
    if(!validMetric('durationSeconds',seconds))throw new RangeError('Activity is too short');
    return {exerciseId:timer.exerciseId,workoutId:timer.workoutId,activityId:timer.activityId,durationSeconds:seconds};
  }
  return Object.freeze({validMetric,createActivity,validateActivities,validateState,validateTimer,startTimer,elapsedSeconds,pauseTimer,resumeTimer,stopTimer});
});
