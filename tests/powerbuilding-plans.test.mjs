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
    assert.equal(p[3].length,7);
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
    assert.equal(p.exerciseIds.length,7);
    assert.deepEqual(JSON.parse(JSON.stringify(p.targets)),template[3].map(e=>({sets:e[1],reps:e[2]})));
  }
  assert.notEqual(state.plans[1].id,state.plans[2].id);
});
test('failed save leaves existing plans intact',()=>{
  const {context,state}=makeContext(false);
  vm.runInContext('addTrainerPlan(10)',context);
  assert.equal(state.plans.length,1);
});
