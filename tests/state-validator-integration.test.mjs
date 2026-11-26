import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import '../modules/storage-recovery.js';
for(const prefix of ['', 'preview/']){
 const root=new URL('../'+prefix,import.meta.url);
 const backup=await import(new URL('backup/backup-core.mjs',root));
 const source=readFileSync(new URL('modules/state-storage.js',root),'utf8').replace("import {readState,selectInitialState} from './state-core.js';","const readState=globalThis.MojaStorageRecovery.readState;");
 const {createStateStorage}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const legacy={exercises:[{id:'bench',name:'Bench'}],active:[{exerciseId:'bench',reps:10}],sessions:[{id:1}],unknown:{keep:true}};
 test(prefix+' legacy and versioned backup preserve data',()=>{for(const raw of [JSON.stringify(legacy),JSON.stringify(backup.createBackup(legacy))])assert.deepEqual(backup.parseBackup(raw),legacy);});
 test(prefix+' timed and cardio metadata preserved',()=>{const state={...legacy,active:[{exerciseId:'bench',measurementType:'duration',durationSeconds:40},{exerciseId:'bike',durationSeconds:120,distanceKm:1}],activeSessionMode:'recovery'};assert.deepEqual(backup.parseBackup(JSON.stringify(backup.createBackup(state))),state);});
 test(prefix+' reject invalid backup model',()=>{for(const patch of [{active:[null]},{exercises:[{id:'',name:'x'}]},{activeSessionMode:'invalid'}])assert.throws(()=>backup.parseBackup(JSON.stringify({...legacy,...patch})));});
 test(prefix+' invalid persistence preserves primary and backup bytes',()=>{const m=new Map(),storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)},a=createStateStorage(storage);a.persist(legacy);a.persist({...legacy,active:[]});const before=[...m];assert.throws(()=>a.persist({...legacy,active:[null]}));assert.deepEqual([...m],before);});
 test(prefix+' missing primary with existing backup blocks persistence',()=>{const m=new Map(),storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)},a=createStateStorage(storage);m.set(a.backupKey,JSON.stringify(legacy));assert.throws(()=>a.persist(legacy));assert.equal(m.has(a.key),false);});
}
