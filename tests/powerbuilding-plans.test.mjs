import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../trainer-plans-library.js', import.meta.url),'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url),'utf8');
const makeContext = (saveResult = true) => {
  const exercises = [...html.matchAll(/^\s*\['([^']+)','([^']+)','([^']+)'\]/gm)].map((m,i)=>({id:'exercise-'+i,name:m[1]}));
  const state = {exercises,plans:[{id:1,name:'Existing',trainerTemplateId:9}],sessions:[{id:2}]};
  const context = vm.createContext({state,save:()=>saveResult,render:()=>{},note:()=>{}});
  vm.runInContext(source,context);
  return {context,state,templates:JSON.parse(vm.runInContext('JSON.stringify(trainerPlans)',context))};
};
test('Powerbuilding templates append without shifting existing IDs and use catalog names',()=>{
  const {templates,state} = makeContext();
  assert.equal(templates.length,12);
  assert.equal(templates[9][1],"FBW Express 30'");
  for(const p of templates.slice(10)){
    assert.equal(p[0],'Powerbuilding');
    assert.equal(p[3].length,8);
    assert.equal(p[3].reduce((sum,e)=>sum+e[1],0),20);
    assert.ok(p[3].every(e=>state.exercises.some(x=>x.name===e[0]) && /^\d+–\d+$/.test(e[2]) && e[3]>=90));
  }
});
test('both plans copy complete prescriptions without changing existing plans or history',()=>{
  const {context,state,templates}=makeContext();
  vm.runInContext('addTrainerPlan(10);addTrainerPlan(11);addTrainerPlan(10)',context);
  assert.equal(state.plans.length,3);
  assert.equal(state.plans[0].name,'Existing');
  assert.deepEqual(state.sessions,[{id:2}]);
  for(const p of state.plans.slice(1)){
    const template=templates[p.trainerTemplateId];
    assert.equal(p.exerciseIds.length,8);
    assert.deepEqual(JSON.parse(JSON.stringify(p.targets)),template[3].map(e=>({sets:e[1],reps:e[2],workingOnly:true,notes:e[4]+' · RIR 2 (na początku 3) · przerwa '+e[3]+' s. '+e[5]})));
  }
  assert.notEqual(state.plans[1].id,state.plans[2].id);
});
test('failed save leaves existing plans intact',()=>{
  const {context,state}=makeContext(false);
  vm.runInContext('addTrainerPlan(10)',context);
  assert.equal(state.plans.length,1);
});

test('shared exercises retain comparable rep ranges',()=>{
  const {templates}=makeContext();
  const [a,b]=templates.slice(10);
  for(const e of a[3]){
    const match=b[3].find(x=>x[0]===e[0]);
    if(match)assert.equal(e[2],match[2]);
    assert.ok(e[5].length>20);
  }
});
