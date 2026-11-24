const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../progress-core-v2.js');
const now = Date.now();
const session = (days, weight, rir=1, mode='standard') => ({date:new Date(now-days*86400000).toISOString(),sessionMode:mode,sets:[{exerciseId:'bench',weight,reps:8,rir}]});
const sessions=[session(40,60),session(10,65),session(8,67,9),session(5,70)];
function setup(){
 const root={innerHTML:''};
 const context={ProgressCore:core,state:{sessions,exercises:[{id:'bench',name:'Bench'}],profile:{}},document:{getElementById:()=>root},console};
 context.window=context;
 vm.createContext(context);
 for(const file of ['progress-report-dashboard.js','progress-ui-v2.js'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8'),context);
 return {context,root};
}
test('continuous path skips invalid measurement and spans long gaps',()=>{
 const {context,root}=setup();
 context.renderProgress();
 const svg=root.innerHTML.match(/<svg[\s\S]*?<\/svg>/)[0];
 assert.equal((svg.match(/<circle /g)||[]).length,3);
 assert.equal((svg.match(/<path /g)||[]).length,1);
 assert.match(svg,/<path d="M[^"]+L[^"]+L[^"]+"/);
});
test('diagnostics and summary preserve history and exclude duplicate panels',()=>{
 const before=JSON.stringify(sessions);
 const {context,root}=setup();
 context.progressView('overview');
 assert.match(root.innerHTML,/Diagnostyka treningowa/);
 context.progressView('reports');
 assert.match(root.innerHTML,/Podsumowanie okresowe/);
 assert.doesNotMatch(root.innerHTML,/Obciążenie partii mięśniowych|Masa ciała/);
 assert.match(root.innerHTML,/Eksport CSV/);
 assert.equal(JSON.stringify(sessions),before);
});
test('recovery sessions do not enter comparable trend',()=>{
 const rows=core.exerciseSessions([session(3,60),session(2,100,1,'recovery')],'bench');
 assert.equal(rows[1].comparableOneRM,null);
});
