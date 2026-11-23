/* Session-level training intent. Legacy sessions are standard by default. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MojaSessionMode = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  const STANDARD = 'standard';
  const RECOVERY = 'recovery';

  function normalize(value) {
    return value === RECOVERY ? RECOVERY : STANDARD;
  }

  function isRecovery(session) {
    return normalize(session?.sessionMode) === RECOVERY;
  }

  function isProgressionEligible(session) {
    return !isRecovery(session);
  }

  function progressionHistory(sessions) {
    return (Array.isArray(sessions) ? sessions : []).filter(isProgressionEligible);
  }

  return Object.freeze({
    STANDARD,
    RECOVERY,
    normalize,
    isRecovery,
    isProgressionEligible,
    progressionHistory
  });
});
