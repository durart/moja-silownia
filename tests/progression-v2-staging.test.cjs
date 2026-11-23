const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname,'..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const advisor = require('../preview/assistant/assistant-progression.js');
const row = (reps,rir,weight=60) => ({exerciseId:'row',reps,rir,weight,setType:'W'});
const session = (date,rows) => ({date,sets:rows});
const dates = ['2026-11-23T08:00:00Z','2026-11-19T08:00:00Z','2026-11-15T08:00:00Z'];
const suggest = sessions => advisor.suggest(sessions,'row',{minReps:8,maxReps:12,equipmentType:'barbell'});
test('v2 staging offers fast track on genuinely underloaded sets',()=>{
 const v=suggest([session(dates[0],[row(12,4),row(12,4),row(12,3)])]);
 assert.equal(v.path,'FAST_TRACK_1_SESSION');
 assert.equal(v.suggestedWeight,62.5);
});
test('v2 staging progresses after sustained repetitions even below 3% e1RM',()=>{
 const v=suggest([session(dates[0],[row(12,2),row(12,2),row(12,2)]),
   session(dates[1],[row(12,2),row(12,2),row(11,2)]),
   session(dates[2],[row(12,2),row(11,2),row(10,2)])]);
 assert.equal(v.path,'REPS_TREND_CONFIRMED');
 assert.ok(v.e1rmTrendPct<3);
});
test('v2 staging keeps RIR, pain and real-world load guards',()=>{
 const notReady=suggest([session(dates[0],[row(12,null),row(12,3)])]);
 assert.equal(notReady.action,'maintain');
 const flagged={...session(dates[0],[row(12,4),row(12,4)]),exerciseNotes:{row:{flag:'pain'}}};
 assert.equal(suggest([flagged]).action,'review');
 const largeStep=advisor.calculateNextWeight(45,'machine_stack',6);
 assert.equal(largeStep.suggestedWeight,null);
 assert.equal(largeStep.blockedByStep,true);
});
test('preview retains profile and isolated PWA cache; production 1.9 stays unchanged',()=>{
 const index=read('preview/index.html'),sw=read('preview/sw.js'),prod=read('index.html');
 assert.match(index,/TEST v2\.0\.0/);
 assert.match(index,/moja-silownia-preview-v01/);
 assert.match(index,/profile-core\.js\?v=190/);
 assert.match(index,/equipment-settings-ui\.js\?v=200/);
 assert.match(sw,/moja-silownia-preview-shell-v200-progression-/);
 assert.match(sw,/equipment-settings-ui\.js\?v=200/);
 assert.match(prod,/Moja Siłownia v1\.9\.0/);
 assert.doesNotMatch(prod,/equipment-settings-ui\.js/);
 assert.equal(read('profile-core.js'),read('preview/profile-core.js'));
});
