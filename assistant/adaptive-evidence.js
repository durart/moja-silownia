/* Read-only trend evidence for comparable strength sessions. */
(function(root, factory) {
  const common = typeof module === 'object' && module.exports;
  const api = factory(common ? require('./assistant-progression.js') : root.MojaAdvisorProgression, common ? require('./session-mode.js') : root.MojaSessionMode);
  if (common) module.exports = api;
  else root.MojaAdaptiveEvidence = api;
})(globalThis, function(progression, sessionMode) {
'use strict';

function analyze(sessions, exerciseId, { expectedWorkingSets, now = Date.now() } = {}) {
  const empty = { status: 'insufficient_data', observations: 0, samples: [] };
  if (exerciseId == null || !Number.isSafeInteger(expectedWorkingSets) ||
      expectedWorkingSets < 1 || expectedWorkingSets > 30 || !Number.isFinite(now)) return empty;
  const history = (Array.isArray(sessions) ? sessions : [])
    .filter(s => typeof s?.date === 'string' && Number.isFinite(Date.parse(s.date)) &&
      Date.parse(s.date) <= now && sessionMode.isProgressionEligible(s))
    .map(s => ({ date: s.date, rows: progression.workingSets(s, exerciseId) }))
    .filter(s => s.rows.length)
    .sort((a,b) => Date.parse(b.date) - Date.parse(a.date));
  const samples = [];
  const reference = history[0]?.rows;
  if (!reference || reference.length !== expectedWorkingSets) return empty;
  const dates = new Set();
  for (const item of history.slice(0, 6)) {
    const time = Date.parse(item.date);
    if (dates.has(time) || Date.parse(history[0].date) - time > 42 * 86400000 ||
        item.rows.length !== expectedWorkingSets ||
        item.rows.some((row,i) => row.weight <= 0 || row.weight !== reference[i].weight ||
          row.rir === null)) break;
    dates.add(time);
    samples.push({ rows: item.rows, date: item.date, reps: item.rows.reduce((sum,row) => sum + row.reps,0),
      reserve: item.rows.reduce((sum,row) => sum + row.rir,0) });
  }
  // Evidence only: no prescription, no recovery decision, no state writes.
  return { status: samples.length >= 3 ? 'comparable' : 'insufficient_data',
    observations: samples.length, samples };
}
return Object.freeze({ analyze });

});
