const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mode = require('../preview/assistant/session-mode.js');
const progression = require('../preview/assistant/assistant-progression.js');
const advisor = require('../preview/assistant/assistant-core.js');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const exerciseId = 'seed-4';
const satDate = '2026-11-21T12:00:00Z';
const sunDate = '2026-11-22T12:00:00Z';
const wedDate = Date.parse('2026-11-25T12:00:00Z');
const row = (weight, rir, reps=12) => ({ exerciseId, weight, rir, reps, setType:'W' });
const saturday = {date:satDate,planName:'A',sets:[row(50,5),row(68,3),row(85,0)]};
const sunday = {date:sunDate,planName:'A',sessionMode:'recovery',sets:[row(55,5),row(60,4)]};
const suggest = sessions => progression.suggest(sessions,exerciseId,
  {minReps:8,maxReps:12,equipmentType:'machine_stack'});

test('legacy and unknown session types default to standard',()=>{
 assert.equal(mode.normalize(undefined),'standard');
 assert.equal(mode.normalize('standard'),'standard');
 assert.equal(mode.normalize('recovery'),'recovery');
 assert.equal(mode.isProgressionEligible(saturday),true);
 assert.equal(mode.isProgressionEligible(sunday),false);
 assert.deepEqual(mode.progressionHistory([saturday,sunday]),[saturday]);
});

test('Saturday pyramid and Sunday recovery: standard reference remains 85 kg and no increase',()=>{
 const result=suggest([sunday,saturday]);
 assert.equal(result.weight,85);
 assert.equal(result.lastTopWeight,85);
 assert.equal(result.bestWeight,85);
 assert.equal(result.sessionCount,2);
 assert.equal(result.progressionSessionCount,1);
 assert.equal(result.skippedRecoveryCount,1);
 assert.equal(result.action,'maintain');
 assert.equal(result.suggestedWeight,undefined);
});

test('Recovery with repeated 60 kg and very high RIR does not activate fast track',()=>{
 const recovery={...sunday,sets:[row(60,5),row(60,5)]};
 const result=suggest([recovery,saturday]);
 assert.equal(result.weight,85);
 assert.equal(result.action,'maintain');
 assert.equal(result.suggestedWeight,undefined);
});

test('Three standard progress sessions remain comparable despite interspersed recovery',()=>{
 const standardDates=['2026-11-13T12:00:00Z','2026-11-17T12:00:00Z','2026-11-21T12:00:00Z'];
 const history=standardDates.map(date=>({date,planName:'A',sets:[row(60,2),row(60,2)]}));
 const result=suggest([sunday,...history]);
 assert.equal(result.action,'consider_increase');
 assert.equal(result.path,'STANDARD_3_SESSIONS');
 assert.equal(result.weight,60);
 assert.equal(result.skippedRecoveryCount,1);
});

test('Recovery-only history is never presented as a progression baseline',()=>{
 const result=suggest([sunday]);
 assert.equal(result.action,'insufficient_data');
 assert.match(result.reason,/regeneracyjne/);
});

test('Pain in recovery session still guards against increasing loads',()=>{
 const standard=[{...saturday,sets:[row(60,4),row(60,4)]}];
 const recovery={...sunday,exerciseNotes:{[exerciseId]:{flag:'pain'}}};
 const result=suggest([recovery,...standard]);
 assert.equal(result.action,'review');
});

test('Weekly activity and muscle fatigue include recovery, but rotation uses standard history',()=>{
 const exercises=[{id:exerciseId,group:'Plecy'}];
 const plans=[{id:1,name:'A',exerciseIds:[exerciseId]},{id:2,name:'B',exerciseIds:[exerciseId]}];
 const state={plans,exercises,sessions:[sunday,saturday],startedAt:null,active:[],activePlan:null,manualStarted:false};
 const result=advisor.evaluate(state,{now:wedDate,weeklyGoal:3});
 const without=advisor.evaluate({...state,sessions:[saturday]},{now:wedDate,weeklyGoal:3});
 const a=result.candidates.find(c=>c.planName==='A');
 const b=result.candidates.find(c=>c.planName==='B');
 assert.equal(a.historyCount,1);
 assert.equal(a.lastPerformed,satDate);
 assert.equal(b.historyCount,0);
 assert.ok(a.reasons.some(r=>r.includes('ostatnio jako standardowy')));
 assert.ok(result.candidates.every(c=>c.load>=without.candidates.find(old=>old.planName===c.planName).load));
 assert.ok(result.candidates.some(c=>c.load>without.candidates.find(old=>old.planName===c.planName).load));
});

test('Recovery session survives backup JSON and does not mutate existing workouts',()=>{
 const data={exercises:[],plans:[],active:[],sessions:[saturday,sunday],activeSessionMode:'recovery'};
 const snapshot=JSON.stringify(data);
 const decoded=JSON.parse(snapshot);
 assert.equal(decoded.sessions[1].sessionMode,'recovery');
 assert.equal(decoded.activeSessionMode,'recovery');
 suggest(decoded.sessions);
 advisor.evaluate({...decoded,plans:[]},{now:wedDate});
 assert.equal(JSON.stringify(data),snapshot);
});

test('Staging has one start toggle and one active session toggle, without per-exercise toggles',()=>{
 const html=read('preview/index.html');
 const sw=read('preview/sw.js');
 assert.match(html,/id="preRecoveryMode"/);
 assert.match(html,/id="activeRecoveryMode"/);
 assert.match(html,/changeSessionRecoveryMode\(this.checked\)/);
 assert.match(html,/sessionMode:MojaSessionMode.normalize\(state.activeSessionMode\)/);
 assert.match(html,/state.activeSessionMode='standard'/);
 assert.match(html,/id="planWorkout"/);
 assert.match(html,/id="manualToday"/);
 assert.match(html,/moja-silownia-preview-v01/);
 assert.match(html,/session-mode\.js\?v=200/);
 assert.match(html,/assistant-core\.js\?v=200/);
 assert.match(sw,/moja-silownia-preview-shell-v47-compact-workout-3\.3\.0/);
 assert.match(sw,/session-mode\.js\?v=200/);
 assert.match(sw,/assistant-core\.js\?v=200/);
 assert.match(read('index.html'),/Moja Siłownia v3\.3\.0/);
 assert.match(read('index.html'),/id="preRecoveryMode"/);
});
