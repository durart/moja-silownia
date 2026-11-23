/* Pure, backward-compatible profile model for Moja Silownia v1.9.0. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ProfileCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  const validWeight = value => typeof value === 'number' && Number.isFinite(value) && value >= 20 && value <= 350;
  const validHeight = value => typeof value === 'number' && Number.isFinite(value) && value >= 80 && value <= 250;
  const validDate = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
  };
  const emptyProfile = () => ({ heightCm: null, weightHistory: [] });

  function isValidProfile(profile) {
    if (profile == null) return true; // Existing pre-1.9.0 backups have no profile.
    if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return false;
    if (profile.heightCm != null && !validHeight(profile.heightCm)) return false;
    if (profile.weightHistory != null && !Array.isArray(profile.weightHistory)) return false;
    const rows = profile.weightHistory || [];
    if (rows.some(row => !row || typeof row !== 'object' ||
      typeof row.id !== 'string' || !row.id.trim() ||
      !validDate(row.date) || !validWeight(row.weightKg))) return false;
    return new Set(rows.map(row => row.id)).size === rows.length &&
      new Set(rows.map(row => row.date)).size === rows.length;
  }

  function normalizeProfile(profile) {
    if (!isValidProfile(profile)) throw new Error('Nieprawidłowe dane profilu');
    if (profile == null) return emptyProfile();
    return {
      ...profile,
      heightCm: profile.heightCm ?? null,
      weightHistory: [...(profile.weightHistory || [])]
        .map(row => ({ ...row }))
        .sort((a, b) => b.date.localeCompare(a.date))
    };
  }

  function currentWeight(profile) {
    const entries = normalizeProfile(profile).weightHistory;
    return entries.length ? entries[0].weightKg : null;
  }

  function upsertWeight(profile, measurement) {
    const base = normalizeProfile(profile);
    if (!measurement || !validDate(measurement.date) || !validWeight(measurement.weightKg))
      throw new Error('Sprawdź datę i masę ciała (20–350 kg)');
    const existing = base.weightHistory.find(row => row.date === measurement.date);
    const id = existing?.id || measurement.id;
    if (typeof id !== 'string' || !id.trim())
      throw new Error('Brak identyfikatora pomiaru');
    base.weightHistory = base.weightHistory.filter(row => row.date !== measurement.date && row.id !== id);
    base.weightHistory.push({ id, date: measurement.date, weightKg: measurement.weightKg });
    return normalizeProfile(base);
  }

  function removeWeight(profile, id) {
    const base = normalizeProfile(profile);
    base.weightHistory = base.weightHistory.filter(row => row.id !== id);
    return base;
  }

  function resolveWorkoutWeight(session, profile, legacyWeight) {
    if (validWeight(session?.preWorkout?.weight)) return session.preWorkout.weight;
    if (validWeight(session?.bodyWeightKg)) return session.bodyWeightKg;
    const current = currentWeight(profile);
    if (current !== null) return current;
    return validWeight(legacyWeight) ? legacyWeight : 100.6; // Legacy estimation only; never a measurement.
  }

  function relativeStrength(sessions, exerciseId, bodyWeightKg) {
    if (!validWeight(bodyWeightKg) || typeof exerciseId !== 'string' || !exerciseId) return null;
    let bestLoad = 0;
    let bestE1rm = 0;
    for (const session of (Array.isArray(sessions) ? sessions : [])) {
      for (const set of (Array.isArray(session?.sets) ? session.sets : [])) {
        if (set?.exerciseId !== exerciseId || set.setType === 'R' || set.type === 'warmup') continue;
        const load = Number(set.weight);
        const reps = Number(set.reps);
        if (!Number.isFinite(load) || load <= 0 || !Number.isInteger(reps) || reps <= 0) continue;
        bestLoad = Math.max(bestLoad, load);
        const rir = set.rir == null || set.rir === '' ? 0 : Number(set.rir);
        if (!Number.isFinite(rir) || rir < 0 || rir > 5) continue;
        const effectiveReps = reps + rir;
        if (effectiveReps > 12) continue;
        bestE1rm = Math.max(bestE1rm, load * (1 + effectiveReps / 30));
      }
    }
    if (bestLoad === 0) return null;
    return {
      bestLoadKg: bestLoad,
      estimatedOneRmKg: bestE1rm || null,
      relativeLoad: bestLoad / bodyWeightKg,
      relativeOneRm: bestE1rm ? bestE1rm / bodyWeightKg : null
    };
  }

  return Object.freeze({
    validWeight, validHeight, validDate, isValidProfile, normalizeProfile,
    currentWeight, upsertWeight, removeWeight, resolveWorkoutWeight, relativeStrength
  });
});
