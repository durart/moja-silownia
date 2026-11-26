import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import core from '../modules/timed-exercise-core.js';
import fatigue from '../muscle-fatigue-core.js';
import progress from '../progress-core-v2.js';
import {detectRecords} from '../modules/records.js';
import '../summary-core.js';
import '../progress-report-dashboard.js';
const duration=(seconds=45,extra={})=>({exerciseId:'seed-14',name:'Plank',measurementType:'duration',durationSeconds:seconds,weight:0,setType:'W',...extra});
const reps={exerciseId:'bench',name:'Wyciskanie',weight:50,reps:10,rir:2};
const session=(sets,extra={})=>({date:'2026-11-25T12:00:00Z',sets,durationSeconds:600,...extra});
const exercise=[{id:'seed-14',group:'Brzuch',name:'Plank'},{id:'bench',group:'Klatka piersiowa'}];
test('duration records compare equivalent added weight and standard working sets only',()=>{
 const history=[session([duration(45),duration(90,{weight:10}),duration(80,{setType:'R'})]),session([duration(100)],{sessionMode:'recovery'})];
 const options={exerciseId:'seed-14',weight:0,durationSeconds:50,completedSessions:history};
 assert.deepEqual(core.detectDurationRecord(options),['Czas']);
 assert.deepEqual(core.detectDurationRecord({...options,durationSeconds:45}),[]);
 assert.deepEqual(core.detectDurationRecord({...options,sessionMode:'recovery'}),[]);
 assert.deepEqual(core.detectDurationRecord({...options,setType:'R'}),[]);
 assert.deepEqual(core.detectDurationRecord({...options,completedSessions:[]}),[]);
 assert.deepEqual(core.detectDurationRecord({...options,activeSets:[duration(55)]}),[]);
});
test('timed sets never contaminate repetition records, volume or e1RM',()=>{
 const mixed=duration(60,{weight:100,reps:10,rir:2});
 assert.equal(progress.estimatedRM(mixed),null);
 assert.equal(progress.volume([reps,mixed]),500);
 assert.equal(progress.exerciseSessions([session([mixed])],'seed-14').length,0);
 assert.deepEqual(detectRecords({exerciseId:'seed-14',weight:10,reps:5,activeSets:[mixed]}),[]);
});
test('time analytics include actual dates, distinguish recovery, skip warmups and old ambiguous entries',()=>{
 const all=[session([duration(45),duration(60),duration(90,{setType:'R'}),{exerciseId:'seed-14',reps:100,weight:0}]),session([duration(70)],{date:'2026-11-26T12:00:00Z',sessionMode:'recovery'})];
 const before=JSON.stringify(all),r=progress.durationSummary(all,'seed-14');
 assert.deepEqual(r.sessions.map(s=>s.bestSeconds),[60,70]);
 assert.deepEqual(r.sessions.map(s=>s.totalSeconds),[105,70]);
 assert.equal(r.best.durationSeconds,60);
 assert.equal(r.totalSeconds,175);
 assert.equal(JSON.stringify(all),before);
});
test('mixed monthly report counts duration sets separately without changing tonnage',()=>{
 const r=progress.monthReport([session([reps,duration(45),duration(60)])],2026,11);
 assert.equal(r.volume,500);assert.equal(r.sets,3);assert.equal(r.exercises,2);assert.equal(r.timedSeconds,105);
});
test('timed muscle load scales with duration and retains existing repetition model',()=>{
 const short=fatigue.impulse(session([duration(20)]),exercise).Brzuch;
 const long=fatigue.impulse(session([duration(60)]),exercise).Brzuch;
 assert.ok(short>0&&long>short);
 assert.equal(fatigue.impulse(session([duration(0)]),exercise).Brzuch,undefined);
 assert.ok(fatigue.impulse(session([duration(60,{setType:'R'})]),exercise).Brzuch<long);
 assert.deepEqual(fatigue.sessionImpulse(session([reps],{fatigueModel:2,fatigueImpulse:{Barki:5}}),exercise),{Barki:5});
 assert.ok(fatigue.sessionImpulse(session([duration(60)],{fatigueModel:2,fatigueImpulse:{}}),exercise).Brzuch>0);
 assert.deepEqual(fatigue.sessionImpulse(session([duration(60)],{fatigueModel:3,fatigueImpulse:{Brzuch:12}}),exercise),{Brzuch:12});
});
test('summary aggregates real seconds independently of repetitions and keeps raw history unchanged',()=>{
 const s=session([reps,duration(45),duration(60,{pr:['Czas']})]),before=JSON.stringify(s);
 const model=globalThis.SportSummaryCore.build(s);
 assert.equal(model.volume,500);assert.equal(model.reps,10);assert.equal(model.timedSeconds,105);
 assert.equal(model.setCount,3);assert.equal(model.prCount,1);
 const timed=model.groups.find(g=>g.id==='seed-14');
 assert.equal(timed.timedSeconds,105);
 assert.ok(timed.sets.every(s=>!('reps' in s)&&!('rir' in s)));
 assert.equal(JSON.stringify(s),before);
});
test('period report and CSV preserve duration and never turn seconds into reps or tonnage',()=>{
 const sessions=[session([reps,duration(45,{weight:5})],{date:new Date(Date.now()-1000).toISOString()})];
 const api=globalThis.ProgressReportDashboard;
 const html=api.build(sessions,exercise,{},84);
 assert.match(html,/500 kg/);assert.match(html,/Czas izometrii/);assert.match(html,/45 s/);assert.doesNotMatch(html,/NaN|undefined/);
 const csv=api.csv(sessions,exercise,84);
 assert.match(csv,/Czas izometrii \(s\)/);assert.match(csv,/"5";"";"";"Robocza";"45"/);
 assert.match(csv,/"50";"10";"2";"Robocza";""/);
});
test('history and anatomy share the actual timed measurement, not fabricated repetitions',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const inline=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 const role=inline.slice(inline.indexOf('function muscleRoles('),inline.indexOf('const ANATOMY_REGIONS='));
 const ctx={window:{MojaTimedExercise:core},muscleFactors:()=>[['Brzuch',1]]};
 vm.createContext(ctx);vm.runInContext(role,ctx);
 assert.equal(ctx.muscleRoles(session([duration(45)])).Brzuch,1);
 assert.equal(ctx.muscleRoles(session([duration(0)])).Brzuch,undefined);
});
