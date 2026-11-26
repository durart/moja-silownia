import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const base={exercises:[{id:'x',name:'Test'}],active:[{exerciseId:'x',weight:10,reps:5}],sessions:[]};
for(const prefix of ['', 'preview/']){
 const ctx=vm.createContext({console});
 vm.runInContext(readFileSync(new URL('../'+prefix+'modules/storage-recovery.js',import.meta.url),'utf8'),ctx);
 const v=ctx.MojaStorageRecovery;
 const cases=[
 ['VAL-01 current state',()=>assert.equal(v.validState({...base,plans:[]}),true)],
 ['VAL-02 legacy optional fields absent',()=>assert.equal(v.validState(base),true)],
 ['VAL-03 malformed structure',()=>assert.equal(v.validState({...base,active:null}),false)],
 ['VAL-04 malformed entries',()=>assert.equal(v.validState({...base,sessions:[null]}),false)],
 ['VAL-05 invalid exercise ID',()=>assert.equal(v.validState({...base,exercises:[{id:'',name:'Test'}]}),false)],
 ['VAL-06 invalid write',()=>assert.throws(()=>v.serializeState({...base,active:[null]}))],
 ['VAL-07 invalid serialized state',()=>assert.throws(()=>v.serializeState({...base,toJSON:()=>({})}))],
 ['VAL-08 preserve extra fields',()=>assert.equal(JSON.parse(v.serializeState({...base,custom:{a:1}})).custom.a,1)],
 ['VAL-09 round trip',()=>assert.equal(JSON.stringify(v.readState(v.serializeState(base))),JSON.stringify(base))],
 ['VAL-10 session modes',()=>{assert.equal(v.validState({...base,activeSessionMode:'recovery'}),true);assert.equal(v.validState({...base,activeSessionMode:'invalid'}),false);}]
 ];
 for(const [name,fn] of cases)test(prefix+name,fn);
}
