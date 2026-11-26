import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
for(const prefix of ['', 'preview/']){
 const html=readFileSync(new URL('../'+prefix+'index.html',import.meta.url),'utf8');
 const code=html.split('\n').find(x=>x.startsWith('function commitWorkoutMutation('));
 for(const [id,kind,fail] of [['01','manual',false],['02','manual',true],['03','plan',false],['04','plan',true],['05','strength',false],['06','strength',true],['07','rest',true],['08','timed',false],['09','timed',true],['10','retry',true]]){
 test(prefix+'TRN-'+id+' '+kind,()=>{
 const c=vm.createContext({structuredClone,console,Date,state:{active:[],restUntil:123},manualDrafts:{x:1},fail,save(){return !c.fail},note(){},restSeconds(){return 90}});
 vm.runInContext(code,c);const before=JSON.stringify(c.state),draft=JSON.stringify(c.manualDrafts);
 const mutate=()=>{if(kind==='manual')c.state.manualStarted=true;else if(kind==='plan')c.state.activePlan=1;else{c.state.active.push({exerciseId:'x',durationSeconds:kind==='timed'?30:undefined});c.manualDrafts.x=0;}};
 assert.equal(c.commitWorkoutMutation(mutate,kind==='manual'||kind==='plan'?null:'x'),!fail);
 if(fail){assert.equal(JSON.stringify(c.state),before);assert.equal(JSON.stringify(c.manualDrafts),draft);}else assert.notEqual(JSON.stringify(c.state),before);
 if(kind==='retry'){c.fail=false;assert.equal(c.commitWorkoutMutation(mutate,'x'),true);assert.equal(c.state.active.length,1);}
 });
 }
}
