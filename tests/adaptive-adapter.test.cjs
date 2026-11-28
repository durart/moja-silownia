'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {suggest}=require('../assistant/adaptive-adapter.js');
const now=Date.parse('2026-11-27T12:00:00Z');
const row=(i,weight)=>({exerciseId:'bench',planId:'A',planSlotIndex:0,planSetIndex:i,weight,reps:12,rir:3});
const session=d=>({date:new Date(now-d*86400000).toISOString(),sets:[row(0,70),row(1,65)]});
const input={sessions:[session(0),session(4),session(8)],exerciseId:'bench',planId:'A',slotIndex:0,targets:[{min:8,max:12,rir:2},{min:8,max:12,rir:2}],equipmentType:'barbell',now};
test('strict context connects history to prescription',()=>assert.equal(suggest(input)[0].weight,72.5));
test('other plan and slot are excluded',()=>{assert.equal(suggest({...input,planId:'B'}),null);assert.equal(suggest({...input,slotIndex:1}),null);});
test('ambiguous order and missing indices block recommendation',()=>{const s=session(0);s.sets.reverse();assert.equal(suggest({...input,sessions:[s,...input.sessions.slice(1)]}),null);});
test('recovery and caution block recommendation',()=>{assert.equal(suggest({...input,sessionMode:'recovery'}),null);assert.equal(suggest({...input,caution:true}),null);});
test('recent pain blocks recommendation',()=>assert.equal(suggest({...input,sessions:[{...session(0),exerciseNotes:{bench:{flag:'pain'}}},...input.sessions.slice(1)]}),null));
test('browser globals load without CommonJS',()=>{const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');const context=vm.createContext({});const observationPath=path.join(__dirname,'../modules/set-observation.js');if(fs.existsSync(observationPath)){vm.runInContext(fs.readFileSync(observationPath,'utf8'),context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../assistant/recommendation-safety.js'),'utf8'),context);}for(const file of ['session-mode','assistant-progression','adaptive-evidence','adaptive-prescription','adaptive-trends','adaptive-adapter'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../assistant',file+'.js'),'utf8'),context);assert.equal(context.MojaAdaptiveAdapter.suggest(input)[0].weight,72.5);});

test('declining reserve blocks weight increase despite top repetitions',()=>{const sessions=[0,4,8].map((d,i)=>{const s=session(d);s.sets.forEach(r=>r.rir=2+i);return s;});assert.equal(suggest({...input,sessions})[0].weight,70);});
test('invalid latest evidence cannot be skipped',()=>{const s=session(0);s.sets[0].rir=null;assert.equal(suggest({...input,sessions:[s,...input.sessions]}),null);});

test('latest skipped or substituted slot breaks comparable history',()=>{for(const exerciseId of ['other','replacement']){const latest={...session(0),sets:[{...row(0,70),exerciseId}]};assert.equal(suggest({...input,sessions:[latest,...[1,4,8].map(session)]}),null);}});
