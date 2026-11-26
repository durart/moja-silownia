const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../progress-report-dashboard.js'),'utf8');
const core=require('../progress-core-v2.js');
function render(sessions=[],exercises=[],profile={},days=84){const window={ProgressCore:core,MuscleAtlasCore:require('../muscle-atlas-core.js'),MuscleAnatomyArt:require('../muscle-anatomy-art.js')};vm.runInNewContext(source,{window,globalThis:window});return window.ProgressReportDashboard.build(sessions,exercises,profile,days)}
test('report renders safely without data',()=>{const html=render();assert.match(html,/Brak okresu porównawczego/);assert.match(html,/0 kg/);assert.doesNotMatch(html,/undefined|NaN/)});
test('report uses actual session data and does not inject exercise names',()=>{const s=[{date:new Date().toISOString(),durationSeconds:3600,sets:[{exerciseId:'x',weight:50,reps:10,rir:2,setType:'W'}]}];const html=render(s,[{id:'x',name:'<img src=x onerror=alert(1)>',group:'Klatka'}]);assert.match(html,/500 kg/);assert.match(html,/1 standardowych/);assert.doesNotMatch(html,/<img/);assert.doesNotMatch(html,/onerror=alert/)});
test('report does not mutate session state',()=>{const s=[{date:new Date().toISOString(),sets:[{exerciseId:'x',weight:20,reps:5}]}],before=JSON.stringify(s);render(s);assert.equal(JSON.stringify(s),before)});
test('report respects requested period',()=>{for(const days of [28,84,168])assert.match(render([],[],{},days),new RegExp('Ostatnie '+days+' dni'))});

test('report shows weekly working sets and period comparison',()=>{const html=render([{date:new Date().toISOString(),sets:[{exerciseId:'x',weight:50,reps:10,rir:2,setType:'W'}]}],[{id:'x',name:'Test',group:'Klatka piersiowa'}]);assert.match(html,/Serie robocze tygodniowo/);assert.match(html,/1 serii/);assert.match(html,/Porównanie okresów/);});

test('CSV export uses real rows and neutralizes spreadsheet formulas',()=>{const window={ProgressCore:core};vm.runInNewContext(source,{window,globalThis:window});const csv=window.ProgressReportDashboard.csv([{date:new Date().toISOString(),sets:[{exerciseId:'x',weight:50,reps:10}]}],[{id:'x',name:'=1+1'}]);assert.ok(csv.includes("'=1+1"));assert.ok(csv.includes('"50";"10"'));});
