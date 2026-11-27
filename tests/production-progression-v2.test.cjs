const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = relative => fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
const index = read('index.html');
const sw = read('sw.js');
const progression = require('../assistant/assistant-progression.js');
const sessionMode = require('../assistant/session-mode.js');
const activeAdvisor = require('../assistant/assistant-core.js');

test('release 2.1 retains progression assets in executable order', () => {
  assert.match(index, /<title>Moja Siłownia v4\.0\.0/);
  assert.match(index, /<span class="badge">v4\.0\.0<\/span>/);
  const scripts = [
    'assistant/session-mode.js?v=200',
    'assistant/assistant-core.js?v=200',
    'assistant/assistant-progression.js?v=201',
    'assistant/equipment-settings-ui.js?v=200',
    'assistant/assistant-progression-ui.js?v=312'
  ];
  for (const script of scripts) {
    assert.equal(index.split('src="./' + script + '"').length - 1, 1, script + ' script tag');
    assert.ok(sw.includes("'./" + script + "'"), script + ' should be pre-cached');
  }
  assert.ok(index.indexOf('assistant/session-mode.js?v=200') < index.indexOf("const key='moja-silownia-v01'"));
  assert.ok(index.indexOf('assistant/assistant-core.js?v=200') < index.indexOf('assistant/assistant-ui.js?v=1'));
  assert.ok(index.indexOf('assistant/assistant-progression.js?v=201') < index.indexOf('assistant/assistant-progression-ui.js?v=312'));
  assert.ok(index.indexOf('assistant/equipment-settings-ui.js?v=200') < index.indexOf('assistant/assistant-progression-ui.js?v=312'));
});

test('data key and profile 1.9 remain unchanged while 2.0 gets a new PWA shell', () => {
  assert.match(index, /const key='moja-silownia-v01'/);
  assert.match(index, /id="profileContent"/);
  assert.match(index, /profile-core\.js\?v=190/);
  assert.match(index, /profile-ui\.js\?v=310/);
  assert.match(sw, /moja-silownia-shell-v58-4\.1\.0-alpha2/);
  assert.match(sw, /profile-core\.js\?v=190/);
  assert.match(sw, /modules\/state-storage\.js/);
  assert.match(index, /state\.profile/);
  assert.match(index, /session\.fatigueImpulse=muscleFatigueImpulse\(session\)/);
});

test('one recovery toggle at start and one during workout; session mode saved atomically', () => {
  assert.equal(index.split('id="preRecoveryMode"').length - 1, 1);
  assert.equal(index.split('id="activeRecoveryMode"').length - 1, 1);
  assert.match(index, /changeSessionRecoveryMode\(this.checked\)/);
  assert.match(index, /state\.activeSessionMode=MojaSessionMode\.normalize\(state\.activeSessionMode\)/);
  assert.match(index, /sessionMode:MojaSessionMode\.normalize\(state\.activeSessionMode\)/);
  assert.match(index, /if\(!save\(\)\)\{\s*state\.activeSessionMode=previous/);
  assert.match(index, /state\.activeSessionMode='standard'/);
  assert.match(index, /Nieprawidłowy tryb treningu/);
});

test('production recovery recommendations preserve strength and fatigue semantics', () => {
  const id = 'exercise-row';
  const row = (w,rir) => ({exerciseId:id,weight:w,reps:12,rir,setType:'W'});
  const heavy = {date:'2026-11-21T12:00:00Z',planName:'A',sets:[row(50,5),row(68,3),row(85,0)]};
  const recovery = {date:'2026-11-22T12:00:00Z',planName:'A',sessionMode:'recovery',sets:[row(60,5),row(60,5)]};
  const result = progression.suggest([recovery,heavy],id,{minReps:8,maxReps:12,equipmentType:'machine_stack'});
  assert.equal(result.weight,85);
  assert.equal(result.bestWeight,85);
  assert.equal(result.skippedRecoveryCount,1);
  assert.equal(result.action,'maintain');
  assert.equal(result.suggestedWeight,undefined);
  assert.equal(sessionMode.isProgressionEligible(recovery),false);
  assert.equal(sessionMode.isProgressionEligible(heavy),true);
  const exercises = [{id,group:'Plecy'}];
  const plans = [{id:1,name:'A',exerciseIds:[id]}];
  const rating = activeAdvisor.evaluate({sessions:[recovery,heavy],plans,exercises},{now:Date.parse('2026-11-25T12:00:00Z')});
  assert.equal(rating.recommended.historyCount,1);
  assert.ok(rating.recommended.load>0);
});

test('staging continues to use independent data and cache', () => {
  assert.match(read('preview/index.html'),/const key='moja-silownia-preview-v01'/);
  assert.match(read('preview/sw.js'),/moja-silownia-preview-shell-v58-4\.1\.0-alpha2/);
  assert.doesNotMatch(sw,/moja-silownia-preview-shell-/);
  assert.equal(read('assistant/session-mode.js'),read('preview/assistant/session-mode.js'));
});
