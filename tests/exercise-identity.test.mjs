import test from 'node:test';
import assert from 'node:assert/strict';
import {EXERCISE_ALIASES,canonicalExerciseId,projectCatalog,projectHistorySets} from '../modules/exercise-identity.mjs';

test('only approved aliases resolve',()=>{
 assert.equal(Object.keys(EXERCISE_ALIASES).length,6);
 for(const [alias,id] of Object.entries(EXERCISE_ALIASES)){
  assert.equal(canonicalExerciseId(alias),id);
  assert.equal(canonicalExerciseId(id),id);
 }
 for(const id of ['seed-61','seed-29','seed-59','seed-102','seed-85','custom-1','__proto__']) assert.equal(canonicalExerciseId(id),id);
});
test('catalog preserves primary category and exposes secondary category without mutating input',()=>{
 const input=[{id:'seed-13',group:'Klatka piersiowa'},{id:'cali-02',group:'Kalistenika'}];
 const before=structuredClone(input);
 const result=projectCatalog(input);
 assert.equal(result.length,1);
 assert.deepEqual(result[0].groups,['Klatka piersiowa','Kalistenika']);
 assert.deepEqual(input,before);
 assert.deepEqual(projectCatalog(result),result);
});
test('missing canonical record does not hide legacy exercise',()=>{
 const input=[{id:'cali-02',group:'Kalistenika'}];
 assert.equal(projectCatalog(input)[0].id,'cali-02');
});
test('history retains every set and original identity without mutation',()=>{
 const input=[{exerciseId:'cali-02',reps:10,weight:0,rir:2},{exerciseId:'seed-13',reps:12,weight:0},{exerciseId:'seed-61',reps:8}];
 const before=structuredClone(input);
 const result=projectHistorySets(input,'seed-13');
 assert.equal(result.length,2);
 assert.equal(result.reduce((sum,set)=>sum+set.reps,0),22);
 assert.equal(result[0].originalExerciseId,'cali-02');
 assert.equal(result[0].rir,2);
 assert.deepEqual(projectHistorySets(result,'cali-02'),result);
 assert.deepEqual(input,before);
});
