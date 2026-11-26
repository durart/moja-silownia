import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,existsSync} from 'node:fs';
import {createBackup,parseBackup} from '../backup/backup-core.mjs';
const require=createRequire(import.meta.url);
const catalog=require('../modules/cardio-catalog.js');
const core=require('../modules/cardio-core.js');
const plans=require('../modules/cardio-plans.js');
for(const name of ['catalog','core','ui','energy','progression','plans']){
 test('cardio '+name+' regression',()=>require('./cardio-'+name+'.test.js'));
}
test('cardio and legacy records round trip without mutation',()=>{
 const activity=core.createActivity('cardio-treadmill-walk',{durationSeconds:1800,speedKmh:5.5,inclinePercent:10},{id:'a',at:'2026-11-26T08:00:00Z'});
 const start='2026-11-26T08:00:00Z';
 const state={exercises:catalog.mergeExercises([{id:'seed-14',name:'Plank'}]),active:[],sessions:[{sets:[{exerciseId:'seed-14',weight:0,reps:30}],cardio:[activity]}],plans:[{id:1,exerciseIds:['cardio-bike'],targets:[{measurementType:'cardio',durationSeconds:1800}]}],startedAt:start,manualStarted:true,manualExerciseIds:['cardio-bike'],cardioTimer:core.pauseTimer(core.startTimer({workoutId:start,exerciseId:'cardio-bike',activityId:'b'},1000),3000),cardioDrafts:{'cardio-bike':{speedKmh:10}}};
 const original=JSON.stringify(state);
 for(const raw of [original,JSON.stringify(createBackup(state))]){
  const restored=parseBackup(raw);
  core.validateState(restored);plans.validatePlans(restored.plans);
  assert.deepEqual(restored,state);
  assert.equal(core.elapsedSeconds(restored.cardioTimer,60000),2);
  assert.equal(plans.inContext(restored,'cardio-bike'),true);
 }
 assert.equal(JSON.stringify(state),original);
});
test('both app shells include all cardio files and isolate data/cache',()=>{
 for(const prefix of ['', 'preview/']){
  const html=readFileSync(new URL('../'+prefix+'index.html',import.meta.url),'utf8');
  const sw=readFileSync(new URL('../'+prefix+'sw.js',import.meta.url),'utf8');
  const key=prefix?'moja-silownia-preview-v01':'moja-silownia-v01';
  assert.ok(html.includes("const key='"+key+"'"));
  const assets=new Function(sw.slice(0,sw.indexOf('self.addEventListener'))+'return ASSETS;')();
  assert.equal(new Set(assets).size,assets.length);
  for(const asset of assets.filter(x=>x!=='./'))assert.ok(existsSync(new URL('../'+prefix+asset.slice(2).split('?')[0],import.meta.url)),asset);
  for(const ex of catalog.exercises)assert.ok(assets.includes(ex.imagePath));
  for(const match of html.matchAll(/(?:src|href)="(\.\/[^"]*cardio[^"]*)"/g))assert.ok(assets.includes(match[1]),match[1]);
 }
});
