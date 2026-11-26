import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareExerciseMigration,persistExerciseMigration} from '../modules/exercise-migration.mjs';
const fixture=()=>({exercises:[{id:'seed-13',group:'Klatka piersiowa'},{id:'cali-02',group:'Kalistenika'}],active:[],sessions:[{id:1,sets:[{exerciseId:'cali-02',reps:8},{exerciseId:'seed-13',reps:9}],exerciseNotes:{'cali-02':{text:'note',flag:'pain'}}}],plans:[{exerciseIds:['cali-02','seed-13'],targets:[1,2]}],restSettings:{'cali-02':90}});
test('preserves sets, slots, notes and original identity',()=>{
 const source=fixture(),before=structuredClone(source);
 const result=prepareExerciseMigration(source);
 assert.equal(result.status,'ready');
 assert.equal(result.state.exercises.length,1);
 assert.deepEqual(result.state.plans[0].exerciseIds,['seed-13','seed-13']);
 assert.deepEqual(result.state.plans[0].targets,[1,2]);
 assert.equal(result.state.sessions[0].sets.length,2);
 assert.equal(result.state.sessions[0].sets[0].originalExerciseId,'cali-02');
 assert.equal(result.state.sessions[0].exerciseNotes['seed-13'].flag,'pain');
 assert.equal(result.state.restSettings['seed-13'],90);
 assert.deepEqual(source,before);
 assert.equal(prepareExerciseMigration(result.state).status,'unchanged');
});
test('conflicting rest settings or notes block migration',()=>{
 const source=fixture();source.restSettings['seed-13']=120;
 source.sessions[0].exerciseNotes['seed-13']={text:'other',flag:'none'};
 const result=prepareExerciseMigration(source);
 assert.equal(result.status,'conflict');assert.equal(result.conflicts.length,2);assert.equal(result.state,source);
});
test('active workout defers migration',()=>{
 const source=fixture();source.active.push({exerciseId:'cali-02'});
 assert.equal(prepareExerciseMigration(source).status,'deferred');
});
test('backup failure prevents replacement',()=>{
 const source=fixture(),raw=JSON.stringify(source);
 const storage={getItem:key=>key==='test'?raw:null,setItem:()=>{throw Error('quota')}};
 assert.throws(()=>persistExerciseMigration(storage,'test',source),/quota/);
 assert.equal(storage.getItem('test'),raw);
});
test('verified backup preserves original data',()=>{
 const source=fixture(),raw=JSON.stringify(source),data=new Map([['test',raw]]);
 const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
 assert.equal(persistExerciseMigration(storage,'test',source).status,'ready');
 assert.equal(data.get('test-before-exercise-identity-v1'),raw);
 assert.equal(JSON.parse(data.get('test')).exercises.length,1);
});
