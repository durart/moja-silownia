(function (root) {
  'use strict';

  // Pure adapter from persisted workout data to presentation data.
  // Never writes to session, its sets, or localStorage.
  function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  function positive(value) {
    return Math.max(0, safeNumber(value));
  }
  function duration(seconds) {
    const n = Math.floor(positive(seconds));
    if (!n) return '—';
    const h = Math.floor(n / 3600);
    const m = Math.floor((n % 3600) / 60);
    const sec = n % 60;
    return h ? h + ' godz. ' + String(m).padStart(2, '0') + ' min'
      : m ? m + ' min ' + String(sec).padStart(2, '0') + ' s'
      : sec + ' s';
  }
  function dateLabel(iso) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? 'Data nieznana'
      : d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function filenameDate(iso) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? 'bez-daty' : [
      d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
  }
  function build(session, options) {
    if (!session || typeof session !== 'object') return null;
    const sourceSets = Array.isArray(session.sets) ? session.sets : [];
    const groups = [], byKey = new Map();
    let volume = 0, reps = 0, records = 0, validSets = 0, timedSeconds = 0;
    for (let i = 0; i < sourceSets.length; i++) {
      const set = sourceSets[i];
      if (!set || typeof set !== 'object') continue;
      validSets++;
      const timed=set.measurementType==='duration';
      const seconds=timed&&Number.isInteger(set.durationSeconds)&&set.durationSeconds>0&&set.durationSeconds<=86400?set.durationSeconds:0;
      const weight = positive(set.weight), count = timed?0:Math.floor(positive(set.reps));
      timedSeconds+=seconds;
      volume += weight * count;
      reps += count*(set.programSet?.perSide?2:1);
      const isPR = Array.isArray(set.pr) && set.pr.length > 0;
      if (isPR) records++;
      const id = String(set.exerciseId || 'unknown-' + i);
      const slot = Number.isInteger(set.planSlotIndex) ? set.planSlotIndex : null;
      const key = JSON.stringify([id, slot, set.programSet?String(set.name||''):null]);
      let group = byKey.get(key);
      if (!group) {
        group = {
          key, id, slot, name: String(set.name || 'Ćwiczenie bez nazwy'),
          count: 0, minWeight: null, maxWeight: null, records: 0, sets: [], program: !!set.programSet
        };
        groups.push(group);
        byKey.set(key, group);
      }
      group.count++;
      if (isPR) group.records++;
      group.minWeight = group.minWeight == null ? weight : Math.min(group.minWeight, weight);
      group.maxWeight = group.maxWeight == null ? weight : Math.max(group.maxWeight, weight);
      if(timed)group.timedSeconds=(group.timedSeconds||0)+seconds;
      group.sets.push({
        weight, ...(timed?{measurementType:'duration',durationSeconds:seconds}:{reps:count,rir:set.rir==null?null:safeNumber(set.rir)}),
        records: isPR ? set.pr.map(String) : [], ...(set.programSet?{programSet:{...set.programSet}}:{})
      });
    }
    let cardioSeconds=0;
    const activities=Array.isArray(session.cardio)?session.cardio:[];
    for(const activity of activities){
      if(!activity||!Number.isInteger(activity.durationSeconds)||activity.durationSeconds<=0)continue;
      const ex=root.MojaCardioCatalog?.getExercise(activity.exerciseId);
      if(!ex)continue;
      cardioSeconds+=activity.durationSeconds;
      groups.push({key:'cardio-'+String(activity.id),id:ex.id,name:ex.name,measurementType:'cardio',durationSeconds:activity.durationSeconds,activity:{...activity},count:0,sets:[],records:0});
    }
    let calories = session.calories;
    if ((!calories || !Number.isFinite(Number(calories.active))) && (!session.program || (session.durationSeconds!=null&&session.bodyWeightKg!=null))) {
      calories = typeof options?.estimateCalories === 'function'
        ? options.estimateCalories(session) : null;
    }
    const activeKcal = calories && Number.isFinite(Number(calories.active))
      ? Math.max(0, Math.round(Number(calories.active))) : null;
    return {
      id: session.id, ...(session.program?{program:{...session.program}}:{}),
      name: String(session.planName || 'Trening dowolny'),
      date: dateLabel(session.date),
      fileDate: filenameDate(session.date),
      duration: duration(session.durationSeconds),
      exerciseCount: groups.length, setCount: validSets,
      reps, volume, ...(timedSeconds?{timedSeconds}:{}), ...(cardioSeconds?{cardioSeconds,cardioActiveKcal:calories?.cardio?.active??null}:{}), prCount: records, activeKcal, groups
    };
  }
  root.SportSummaryCore = Object.freeze({ build, duration, dateLabel, filenameDate });
})(typeof window !== 'undefined' ? window : globalThis);
