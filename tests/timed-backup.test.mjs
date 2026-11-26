import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBackup,parseBackup} from '../backup/backup-core.mjs';
import {makeBackupFile,readBackupFile} from '../backup/backup-local.mjs';
import core from '../modules/timed-exercise-core.js';
import drafts from '../assistant/trainer-drafts.js';
const exercise={id:'seed-14',name:'Plank',equipment:'Masa ciała'};
const timed={exerciseId:exercise.id,weight:0,measurementType:'duration',durationSeconds:47,targetDurationSeconds:45,targetSetCount:3,setType:'W'};
const old={exerciseId:exercise.id,weight:0,reps:60,rir:2};
const bench={exerciseId:'bench',weight:70,reps:10,rir:2};
function state(){return {exercises:[exercise,{id:'bench',name:'Wyciskanie'}],plans:[{id:1,name:'Plan',exerciseIds:[exercise.id],targets:[{sets:3,reps:'45–60 s'}]}],
  sessions:[{id:2,date:'2026-11-25T12:00:00Z',sets:[old,bench,timed],fatigueModel:3,fatigueImpulse:{Brzuch:15}}],
  active:[{...timed,durationSeconds:40,planId:1,planSlotIndex:0,planSetIndex:0}],startedAt:'2026-11-26T12:00:00Z',activePlan:1,activeSessionMode:'standard'};}
test('versioned and raw JSON backups preserve legacy, timed and ordinary sets exactly',()=>{
 const s=state(),before=JSON.stringify(s);
 for(const raw of [JSON.stringify(createBackup(s)),JSON.stringify(s)]){
  const restored=core.validateTimedRecords(parseBackup(raw));
  assert.deepEqual(restored,s);
  assert.equal(restored.sessions[0].sets[0].reps,60);
  assert.equal(restored.sessions[0].sets[0].durationSeconds,undefined);
  assert.equal(restored.sessions[0].sets[2].durationSeconds,47);
 }
 assert.equal(JSON.stringify(s),before);
});
test('backup file includes editable duration goals and actual values',async()=>{
 const s=state();drafts.initialize(s);drafts.ensure(s,exercise.id,0,s.plans[0].targets[0],s.active);
 drafts.change(s,exercise.id,0,1,'durationSeconds','42');
 const file=makeBackupFile(s);
 const restored=core.validateTimedRecords(await readBackupFile(file));
 assert.deepEqual(restored,s);
 assert.equal(drafts.row(restored,exercise.id,0,1).durationSeconds,42);
 assert.equal(drafts.row(restored,exercise.id,0,1).targetDurationSeconds,45);
});
test('invalid explicit duration values are rejected before replacement of user data',()=>{
 for(const patch of [{durationSeconds:0},{durationSeconds:-1},{durationSeconds:1.5},{durationSeconds:'45'},{durationSeconds:86401},{weight:null},{weight:'0'},{targetDurationSeconds:0},{targetSetCount:101},{exerciseId:''}]){
  const s=state();s.sessions[0].sets[2]={...timed,...patch};
  const before=JSON.stringify(s);
  assert.throws(()=>core.validateTimedRecords(s),/Nieprawidłowy zapis serii czasowej/);
  assert.equal(JSON.stringify(s),before);
 }
});
test('old history and incomplete legacy metadata do not trigger a migration or rejection',()=>{
 const s=state();s.active=[];s.sessions=[{id:1,sets:[old,bench]},{id:2}];
 assert.equal(core.validateTimedRecords(s),s);
 assert.equal(s.sessions[0].sets[0].reps,60);
});
test('import validates before user confirmation, retains old storage on failure, clears only running stopwatch on explicit import',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const line=html.split('\n').find(s=>s.startsWith('async function importData('));
 assert.ok(line.indexOf('validateTimedRecords(v)')<line.indexOf("confirm('Import"));
 assert.ok(line.indexOf('delete state.timedTimer')>line.indexOf('const previousState=state;state=v'));
 assert.match(line,/if\(!save\(\)\)\{state=previousState;/);
 assert.doesNotMatch(line,/delete state\.timedRowDrafts/);
});
