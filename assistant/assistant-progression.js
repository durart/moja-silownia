/* Deterministic, read-only progression advice for completed working sets. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MojaAdvisorProgression = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
'use strict';

const EQUIPMENT_CONFIG = Object.freeze({
  barbell: Object.freeze({ step: 2.5, targetPct: 0.035, maxStep: 5 }),
  dumbbell: Object.freeze({ step: 2, targetPct: 0.05, maxStep: 4 }),
  dumbbell_light: Object.freeze({ step: 1, targetPct: 0.05, maxStep: 2 }),
  machine_stack: Object.freeze({ step: 2.5, targetPct: 0.04, maxStep: 5 }),
  cable_micro: Object.freeze({ step: 1.25, targetPct: 0.04, maxStep: 2.5 })
});
const EQUIPMENT_LABELS = Object.freeze({
  'Sztanga': 'barbell', 'Hantle': 'dumbbell',
  'Maszyna': 'machine_stack', 'Wyciąg': 'machine_stack'
});
const numeric = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
const isWarmup = row => row?.setType === 'R' || row?.type === 'warmup' || row?.type === 'R';
const flagNeedsReview = flag => ['pain', 'equipment', 'technique'].includes(flag);
const sessionMode = typeof MojaSessionMode !== 'undefined'
  ? MojaSessionMode
  : (typeof module === 'object' && module.exports && typeof require === 'function'
    ? require('./session-mode.js') : globalThis.MojaSessionMode);

function resolveEquipmentType(type, weight) {
  const mapped = EQUIPMENT_CONFIG[type] ? type : EQUIPMENT_LABELS[type] || 'barbell';
  return mapped === 'dumbbell' && weight < 12 ? 'dumbbell_light' : mapped;
}

function calculateNextWeight(weight, equipmentType, equipmentStepKg) {
  if (!Number.isFinite(weight) || weight <= 0) return null;
  if (equipmentType === 'unknown') return { suggestedWeight: null, needsEquipment: true };
  const resolvedType = resolveEquipmentType(equipmentType, weight);
  const config = EQUIPMENT_CONFIG[resolvedType];
  const configuredStep = numeric(equipmentStepKg) ? Number(equipmentStepKg) : null;
  const step = configuredStep > 0 && configuredStep <= 20
    && Number((configuredStep * 100).toFixed(6)) === configuredStep * 100
    ? configuredStep : config.step;
  const increment = Math.min(Math.max(config.maxStep, step),
    Math.max(step, Math.round(weight * config.targetPct / step) * step));
  const exceedsSafeIncrease = increment / weight > 0.1;
  return {
    suggestedWeight: exceedsSafeIncrease ? null : Number((weight + increment).toFixed(2)),
    increment: Number(increment.toFixed(2)),
    equipmentType: resolvedType,
    ...(exceedsSafeIncrease ? { blockedByStep: true } : {})
  };
}

function workingSets(session, exerciseId) {
  return (Array.isArray(session?.sets) ? session.sets : [])
    .filter(row => row && String(row.exerciseId) === String(exerciseId) && !isWarmup(row)
      && numeric(row.weight) && Number(row.weight) >= 0
      && numeric(row.reps) && Number.isInteger(Number(row.reps)) && Number(row.reps) > 0)
    .map(row => ({
      weight: Number(row.weight),
      reps: Number(row.reps),
      rir: numeric(row.rir) && Number(row.rir) >= 0 && Number(row.rir) <= 5
        ? Number(row.rir) : null
    }));
}

function mainLoad(rows) {
  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.weight)) grouped.set(row.weight, []);
    grouped.get(row.weight).push(row);
  }
  // In a pyramid, repeated lighter back-off sets must not mask the top working load.
  const sorted = [...grouped.entries()].sort((a, b) => b[0] - a[0]);
  return { weight: sorted[0][0], rows: sorted[0][1] };
}

const allRirRecorded = rows => rows.length >= 2 && rows.every(row => row.rir !== null);
const minRir = rows => Math.min(...rows.map(row => row.rir));
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const allTopReps = (rows, high) => rows.length >= 2 && rows.every(row => row.reps >= high);

function calcSessionE1RM(rows) {
  if (!allRirRecorded(rows) || rows.some(row => row.weight <= 0)) return null;
  return mean(rows.map(row => row.weight * (1 + (row.reps + row.rir) / 30)));
}

function suggest(sessions, exerciseId, options = {}) {
  const low = numeric(options.minReps) ? Number(options.minReps) : 8;
  const high = numeric(options.maxReps) ? Number(options.maxReps) : 12;
  if (!Number.isInteger(low) || !Number.isInteger(high) || low < 1 || high < low)
    return { action: 'insufficient_data', reason: 'Nieprawidłowy zakres powtórzeń.' };

  const allHistory = (Array.isArray(sessions) ? sessions : [])
    .filter(session => session && typeof session.date === 'string' && Number.isFinite(Date.parse(session.date)))
    .map(session => ({ session, rows: workingSets(session, exerciseId) }))
    .filter(item => item.rows.length)
    .sort((a, b) => Date.parse(b.session.date) - Date.parse(a.session.date))
    .map(item => ({ ...item, main: mainLoad(item.rows) }));
  const history = allHistory.filter(item => sessionMode.isProgressionEligible(item.session));

  if (!history.length)
    return { action: 'insufficient_data',
      reason: allHistory.length
        ? 'Historia zawiera tylko treningi regeneracyjne. Wykonaj trening standardowy, aby ocenić progresję.'
        : 'Brak zakończonych serii roboczych tego ćwiczenia w historii aplikacji.' };

  const latest = history[0], primary = latest.main;
  const top = latest.rows.reduce((best, row) =>
    row.weight > best.weight || (row.weight === best.weight && row.reps > best.reps) ? row : best);
  const weight = primary.weight;
  const bestWeight = Math.max(...allHistory.flatMap(item => item.rows.map(row => row.weight)));
  const base = {
    weight, lastWeight: weight, lastTopWeight: top.weight, lastTopReps: top.reps,
    bestWeight, sessionCount: allHistory.length, progressionSessionCount: history.length,
    skippedRecoveryCount: allHistory.length - history.length, lastDate: latest.session.date
  };
  const result = (action, reason, extra = {}) => ({ action, reason, ...base, ...extra });
  const increase = (path, reason, extra = {}) => {
    const loading = calculateNextWeight(weight, options.equipmentType || options.equipment,
      options.equipmentStepKg);
    const warning = loading?.blockedByStep
      ? ' Dostępny krok sprzętu przekracza 10% ciężaru roboczego — progresuj powtórzeniami lub wybierz mniejszy krok.' : '';
    return result('consider_increase', reason + warning, {
      path, ...loading, ...extra
    });
  };

  if (weight === 0)
    return result('maintain', 'Ćwiczenie bez dodatkowego ciężaru. Porównuj powtórzenia i RIR, zamiast dodawać kilogramy.');
  if (allHistory.slice(0, 5).some(({ session }) => flagNeedsReview(session.exerciseNotes?.[exerciseId]?.flag)))
    return result('review', 'W ostatnich treningach oznaczono ból, zmianę sprzętu lub problem z techniką. Sprawdź wykonanie przed zwiększeniem obciążenia.');
  if (numeric(options.targetRir) && Number.isInteger(Number(options.targetRir))
      && Number(options.targetRir) >= 0 && Number(options.targetRir) <= 5) {
    const targetRir = Number(options.targetRir);
    const expected = Number(options.expectedWorkingSets);
    if (!Number.isSafeInteger(expected) || expected < 1 || latest.rows.length !== expected)
      return result('maintain', 'Brak kompletu zaplanowanych serii roboczych.');
    if (latest.rows.some(row => row.weight !== weight))
      return result('maintain', 'Piramida ciężaru wymaga osobnej oceny serii.');
    if (latest.rows.some(row => row.reps < low))
      return result('review', 'Nie osiągnięto dolnego zakresu powtórzeń.');
    if (latest.rows.some(row => row.rir === null || !Number.isInteger(row.rir) || row.rir < targetRir))
      return result('maintain', 'Brak potwierdzenia docelowego RIR we wszystkich seriach.');
    if (latest.rows.some(row => row.reps < high)) {
      const comparable = history.slice(0, 3);
      if (comparable.length === 3 && comparable.every(item =>
        item.rows.length === expected && item.rows.every(row =>
          row.weight === weight && Number.isInteger(row.rir) && row.rir >= targetRir))) {
        const totals = comparable.map(item => item.rows.reduce((sum, row) => sum + row.reps, 0));
        if (totals[0] < totals[1] && totals[1] < totals[2])
          return result('maintain', 'Dwa kolejne spadki liczby powtórzeń. Oceń regenerację i rozważ lżejszy trening.', {trend:'declining'});
        if (totals.every(total => total === totals[0]))
          return result('maintain', 'Trzy porównywalne treningi bez wzrostu liczby powtórzeń. Sprawdź przerwy i regenerację.', {trend:'stagnation'});
      }
      return result('maintain', 'Kontynuuj progresję powtórzeń przy obecnym ciężarze.');
    }
    return increase('DOUBLE_PROGRESSION', 'Wszystkie zaplanowane serie osiągnęły górny zakres przy docelowym RIR.');
  }
  if (primary.rows.some(row => row.reps < low))
    return result('review', 'Najcięższa seria robocza nie osiągnęła dolnego zakresu powtórzeń. Sprawdź technikę, przerwy i zmęczenie.');
  const recentHigherLoad = history.slice(1, 4).some(item =>
    Date.parse(latest.session.date) - Date.parse(item.session.date) <= 42 * 86400000
    && item.main.weight > weight * 1.1);
  if (recentHigherLoad)
    return result('maintain', 'Ostatni standardowy trening był wyraźnie lżejszy niż niedawne serie robocze tego ćwiczenia. Nie traktuję go jako potwierdzenia gotowości do zwiększenia ciężaru.');
  if (primary.rows.length < 2)
    return result('maintain', latest.rows.some(row => row.weight !== weight)
      ? 'W piramidzie ciężaru najwyższe obciążenie wystąpiło tylko w jednej serii. Brakuje powtarzalnych serii z tym ciężarem, dlatego nie sugeruję automatycznego zwiększenia.'
      : 'Ostatni trening zawiera mniej niż dwie serie z najwyższym ciężarem roboczym. Pokazuję obciążenie z historii, ale nie sugeruję jeszcze zwiększenia.');
  if (!allRirRecorded(primary.rows))
    return result('maintain', 'Brakuje ocen RIR w ostatnim treningu. Bez nich nie sugeruję zwiększenia ciężaru.');
  if (!allTopReps(primary.rows, high))
    return result('maintain', 'Nie wszystkie serie robocze z dominującym ciężarem osiągnęły górny zakres powtórzeń.');

  if (minRir(primary.rows) >= 2 && mean(primary.rows.map(row => row.rir)) >= 3.5)
    return increase('FAST_TRACK_1_SESSION', 'Duży zapas siły w ostatnim treningu: wszystkie porównywalne serie osiągnęły górny zakres przy średnim RIR ≥ 3,5.');

  const comparable = count => history.length >= count && history.slice(0, count)
    .every(item => item.main.weight === weight && item.main.rows.length === primary.rows.length
      && allRirRecorded(item.main.rows));
  if (comparable(2)) {
    const previous = history[1].main.rows;
    if (allTopReps(previous, high) && minRir(previous) >= 2
      && minRir(primary.rows) >= 2 && mean(primary.rows.map(row => row.rir)) >= 2.5)
      return increase('ACCELERATED_2_SESSIONS', 'Dwa kolejne treningi osiągnęły górny zakres; ostatni ma średni RIR ≥ 2,5 i minimalny RIR ≥ 2.');
  }

  if (comparable(3)) {
    const previous = history[1].main.rows;
    const older = history[2].main.rows;
    const currentE1rm = calcSessionE1RM(primary.rows);
    const previousE1rm = calcSessionE1RM(previous);
    const olderE1rm = calcSessionE1RM(older);
    const previousMean = mean([previousE1rm, olderE1rm]);
    const currentAvgReps = mean(primary.rows.map(row => row.reps));
    const previousAvgReps = mean(previous.map(row => row.reps));
    const olderAvgReps = mean(older.map(row => row.reps));
    const trendPct = previousMean > 0 ? (currentE1rm / previousMean - 1) * 100 : 0;
    const comparableSetCounts = primary.rows.length === previous.length
      && previous.length === older.length;
    const increasingReps = olderAvgReps < previousAvgReps
      && previousAvgReps < currentAvgReps;
    const stableEffort = [primary.rows, previous, older].every(rows => minRir(rows) >= 2);
    if (comparableSetCounts && stableEffort && increasingReps && trendPct >= 3)
      return increase('E1RM_TREND_CONFIRMED',
        'Szacowane e1RM wzrosło o co najmniej 3%, a liczba powtórzeń rośnie.', {
          e1rmTrendPct: Number(trendPct.toFixed(2))
        });
    const oldestTotalReps = older.reduce((sum, row) => sum + row.reps, 0);
    const newestTotalReps = primary.rows.reduce((sum, row) => sum + row.reps, 0);
    const progressingNearLimit = older.some(row => row.reps < high)
      && previous.some(row => row.reps < high) && newestTotalReps - oldestTotalReps >= 2;
    const consistentRir = mean(primary.rows.map(row => row.rir))
      >= mean(older.map(row => row.rir)) - 1;
    if (comparableSetCounts && stableEffort && increasingReps
      && progressingNearLimit && consistentRir && trendPct >= 0)
      return increase('REPS_TREND_CONFIRMED',
        'W trzech treningach stopniowo rosła liczba powtórzeń przy zachowanym RIR ≥ 2. Osiągnięto górny zakres, mimo wzrostu e1RM mniejszego niż 3%.', {
          e1rmTrendPct: Number(trendPct.toFixed(2))
        });
    if (allTopReps(previous, high) && allTopReps(older, high)
      && [primary.rows, previous, older].every(rows => minRir(rows) >= 2))
      return increase('STANDARD_3_SESSIONS', 'Trzy porównywalne treningi osiągnęły górny zakres przy RIR ≥ 2.');
  }

  if (history.length < 2)
    return result('maintain', 'Zapisz kolejne wykonanie ćwiczenia, aby potwierdzić stabilną progresję.');
  if (!comparable(2))
    return result('maintain', 'Ostatnie treningi różnią się ciężarem roboczym lub brakuje porównywalnych serii i RIR.');
  return result('maintain', 'Kontynuuj progresję powtórzeń przy obecnym ciężarze. Do zwiększenia potrzebna jest większa stabilność wyników.');
}

return Object.freeze({
  suggest, workingSets, mainLoad, calculateNextWeight, calcSessionE1RM,
  resolveEquipmentType, EQUIPMENT_CONFIG
});
});
