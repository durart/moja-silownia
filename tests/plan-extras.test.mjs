import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../sport-performance.css',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'Missing inline JavaScript');
function fragment(from,to){
 const a=script.indexOf(from),b=script.indexOf(to,a+from.length);
 assert.ok(a>=0&&b>a,'Missing tested function: '+from);
 return script.slice(a,b);
}
const code=[
 fragment('function planSets(exerciseId,slotIndex){','/* BEGIN PLAN EXTRA CORE */'),
 fragment('/* BEGIN PLAN EXTRA CORE */','/* END PLAN EXTRA CORE */'),
 fragment('function focusPlanExercise(id){','let extraRows={};'),
 fragment('let planUndoDrafts={};','function startManualWorkoutNow(){'),
 fragment('function saveManualRow(id,j){','function renderToday(){'),
 fragment('function finishWorkout(){','function addFromCatalog(id){')
].join('\n');
const exercise=id=>({id,name:id,group:'Plecy',equipment:'Maszyna'});
function setup(){
 const state={
  exercises:['seed-1','seed-2','seed-3','seed-4'].map(exercise),
  plans:[{id:17,name:'Trening A',exerciseIds:['seed-1','seed-2']}],
  activePlan:17,workoutSwaps:{},planRowCounts:{},planExtraExerciseIds:[],manualExerciseIds:[],
  sessions:[],active:[],startedAt:new Date(Date.now()-600000).toISOString(),
  manualStarted:false,preWorkout:null,bodyWeight:100,restUntil:null
 };
 const store={value:null,fail:false},calls={messages:[],timer:0,history:0,confirm:true},elements={};
 const ctx={
  state,manualDrafts:{},planExtraInputDrafts:{},restOptions:[30,90,120],
  window:{matchMedia:()=>({matches:false})},
  document:{querySelectorAll:()=>[],getElementById:id=>elements[id]||null},
  note:message=>calls.messages.push(message),confirm:()=>calls.confirm,
  save:()=>{if(store.fail)throw Error('Storage full');store.value=JSON.stringify(state)},
  renderPlanWorkout:()=>{},renderToday:()=>{},render:()=>{},tick:()=>{},
  tab:name=>{if(name==='history')calls.history++},
  restAudioStop:()=>{},startRest:()=>{calls.timer++},
  detectPR:()=>[],readRir:()=>2,
  safe:String,sportExerciseArt:()=>'<span>icon</span>',
  lastSets:()=>[],planSets:id=>state.active.filter(row=>row.exerciseId===id),
  restSeconds:()=>90,estimateCalories:()=>({active:90,total:120}),
  muscleLoads:()=>({}),muscleFatigueImpulse:()=>({})
 };
 vm.createContext(ctx);
 vm.runInContext(code+'\nthis.api={normalizePlanExtraIds,planExtraStatus,addPlanExtraExercise,removePlanExtraExercise,renderPlanExtraExercises,saveManualRow,removeManualRow,detachPlanExtrasToManual,finishWorkout,togglePlanRow,savePlanRow,planSets,manualSetRows,toggleManualRow};',ctx);
 return {state,store,calls,elements,api:ctx.api};
}
test('inline application code compiles',()=>assert.doesNotThrow(()=>new Function(script)));
test('old backup loads with no new property',()=>{
 const {api}=setup();
 assert.deepEqual(Array.from(api.normalizePlanExtraIds(undefined)),[]);
 assert.deepEqual(Array.from(api.normalizePlanExtraIds(['seed-3','seed-3','unknown'])),['seed-3']);
});
test('adding extra persists without modifying template',()=>{
 const {api,state,store}=setup();
 const before=JSON.stringify(state.plans);
 assert.equal(api.addPlanExtraExercise('seed-3'),true);
 assert.deepEqual(Array.from(state.planExtraExerciseIds),['seed-3']);
 assert.equal(JSON.stringify(state.plans),before);
 assert.deepEqual(JSON.parse(store.value).planExtraExerciseIds,['seed-3']);
});
test('duplicate planned and additional exercise rejected',()=>{
 const {api,state}=setup();
 assert.equal(api.addPlanExtraExercise('seed-3'),true);
 assert.equal(api.addPlanExtraExercise('seed-3'),false);
 assert.equal(api.addPlanExtraExercise('seed-1'),false);
 assert.equal(state.planExtraExerciseIds.length,1);
});
test('swap collision is blocked when adding extra',()=>{
 const {api,state}=setup();state.workoutSwaps={0:'seed-4'};
 assert.equal(api.planExtraStatus('seed-4',state.plans[0]),'in-plan');
 assert.equal(api.addPlanExtraExercise('seed-4'),false);
});
test('unknown exercise or inactive plan is rejected',()=>{
 const {api,state}=setup();
 assert.equal(api.addPlanExtraExercise('unknown'),false);
 state.activePlan=null;
 assert.equal(api.addPlanExtraExercise('seed-3'),false);
});
test('more than one extra is shown in chosen order with standard set editor',()=>{
 const {api,state}=setup();
 api.addPlanExtraExercise('seed-4');api.addPlanExtraExercise('seed-3');
 const markup=api.renderPlanExtraExercises(state.plans[0]);
 assert.ok(markup.indexOf('data-exercise-id="seed-4"')<markup.indexOf('data-exercise-id="seed-3"'));
 assert.match(markup,/pickerOpen\('plan-extra'\)/);
 assert.match(markup,/toggleManualRow\('seed-4',0\)/);
 assert.match(markup,/removeManualRow\('seed-4',0\)/);
});
test('0kg bodyweight extra set and rest timer are supported',()=>{
 const {api,state,store,calls,elements}=setup();
 api.addPlanExtraExercise('seed-3');
 elements['m_seed-3_0_w']={value:'0'};
 elements['m_seed-3_0_r']={value:'12'};
 api.saveManualRow('seed-3',0);
 assert.equal(state.active.length,1);
 assert.equal(state.active[0].weight,0);
 assert.equal(state.active[0].reps,12);
 assert.equal(state.active[0].rir,2);
 assert.equal(calls.timer,1);
 assert.equal(JSON.parse(store.value).active.length,1);
});
test('missing weight is rejected without writing set',()=>{
 const {api,state,elements}=setup();
 api.addPlanExtraExercise('seed-3');
 elements['m_seed-3_0_w']={value:''};
 elements['m_seed-3_0_r']={value:'12'};
 api.saveManualRow('seed-3',0);
 assert.equal(state.active.length,0);
});
test('failed write rolls back new extra and does not claim success',()=>{
 const {api,state,store,calls}=setup();store.fail=true;
 assert.equal(api.addPlanExtraExercise('seed-3'),false);
 assert.equal(state.planExtraExerciseIds.length,0);
 assert.ok(calls.messages.some(x=>x.includes('Nie zapisano')));
});
test('failed write rolls back edited completed set',()=>{
 const {api,state,store,elements}=setup();
 api.addPlanExtraExercise('seed-3');
 elements['m_seed-3_0_w']={value:'55'};
 elements['m_seed-3_0_r']={value:'12'};
 api.saveManualRow('seed-3',0);
 assert.equal(state.active[0].weight,55);
 store.fail=true;elements['m_seed-3_0_w'].value='80';
 api.saveManualRow('seed-3',0);
 assert.equal(state.active[0].weight,55);
});
test('cancel removal preserves completed series',()=>{
 const {api,state,calls,elements}=setup();
 api.addPlanExtraExercise('seed-3');
 elements['m_seed-3_0_w']={value:'55'};elements['m_seed-3_0_r']={value:'12'};
 api.saveManualRow('seed-3',0);
 calls.confirm=false;
 assert.equal(api.removePlanExtraExercise('seed-3'),false);
 assert.equal(state.active.length,1);
});
test('confirmed removal deletes only extra series',()=>{
 const {api,state,elements}=setup();
 api.addPlanExtraExercise('seed-3');
 state.active.push({exerciseId:'seed-1',name:'base',weight:60,reps:10});
 elements['m_seed-3_0_w']={value:'55'};elements['m_seed-3_0_r']={value:'12'};
 api.saveManualRow('seed-3',0);
 assert.equal(api.removePlanExtraExercise('seed-3'),true);
 assert.deepEqual(state.active.map(x=>x.exerciseId),['seed-1']);
 assert.equal(state.planExtraExerciseIds.length,0);
});
test('closing and restoring application keeps extra IDs and confirmed sets',()=>{
 const {api,store,elements}=setup();
 api.addPlanExtraExercise('seed-3');
 elements['m_seed-3_0_w']={value:'55'};elements['m_seed-3_0_r']={value:'12'};
 api.saveManualRow('seed-3',0);
 const restored=JSON.parse(store.value);
 assert.deepEqual(restored.planExtraExerciseIds,['seed-3']);
 assert.equal(restored.active[0].reps,12);
});
test('leaving plan preserves empty extra in manual exercise list',()=>{
 const {api,state}=setup();
 api.addPlanExtraExercise('seed-3');api.detachPlanExtrasToManual();
 assert.deepEqual(Array.from(state.manualExerciseIds),['seed-3']);
 assert.equal(state.planExtraExerciseIds.length,0);
});
test('finish produces one session with plan name and completed extra sets',()=>{
 const {api,state,elements,calls}=setup();
 api.addPlanExtraExercise('seed-3');
 state.active.push({exerciseId:'seed-1',name:'plan',weight:60,reps:10,at:new Date().toISOString()});
 elements['m_seed-3_0_w']={value:'40'};elements['m_seed-3_0_r']={value:'12'};
 api.saveManualRow('seed-3',0);
 api.finishWorkout();
 assert.equal(state.sessions.length,1);
 assert.equal(state.sessions[0].planName,'Trening A');
 assert.deepEqual(Array.from(state.sessions[0].sets,x=>x.exerciseId),['seed-1','seed-3']);
 assert.equal(state.planExtraExerciseIds.length,0);
 assert.equal(calls.history,1);
});
test('CSS includes mobile editor and no broken brace pairs',()=>{
 assert.match(css,/plan-extra-section/);
 assert.match(css,/@media \(max-width: 660px\)/);
 assert.match(css,/prefers-reduced-motion/);
 assert.equal(css.split('{').length,css.split('}').length);
});

test('starting at exercise 2 does not check exercise 1; undo works after the break',()=>{
 const {api,state,store,calls,elements}=setup();
 elements.r_1_0_w={value:'55'};elements.r_1_0_r={value:'12'};
 api.togglePlanRow('seed-2',0,'r_1_0',1);
 assert.equal(state.active.length,1);
 assert.equal(state.active[0].planSlotIndex,1);
 assert.equal(api.planSets('seed-1',0).length,0);
 assert.equal(api.planSets('seed-2',1)[0].weight,55);
 assert.equal(JSON.parse(store.value).active.length,1);
 api.togglePlanRow('seed-2',0,'r_1_0',1);
 assert.equal(state.active.length,0);
 assert.equal(calls.timer,1,'Undo should not restart the rest timer');
});
test('duplicate exercise in plan is isolated by its position',()=>{
 const {api,state,elements}=setup();
 state.plans[0].exerciseIds=['seed-1','seed-2','seed-1'];
 elements.r_2_0_w={value:'70'};elements.r_2_0_r={value:'10'};
 api.togglePlanRow('seed-1',0,'r_2_0',2);
 assert.equal(api.planSets('seed-1',0).length,0);
 assert.equal(api.planSets('seed-1',2)[0].weight,70);
 api.togglePlanRow('seed-1',0,'r_2_0',2);
 assert.equal(state.active.length,0);
});
test('undoing first set keeps later sets completed at their original numbers',()=>{
 const {api,state,elements}=setup();
 for(const j of [0,1,2]){
  elements['r_0_'+j+'_w']={value:String(50+j)};
  elements['r_0_'+j+'_r']={value:'10'};
  api.togglePlanRow('seed-1',j,'r_0_'+j,0);
 }
 api.togglePlanRow('seed-1',0,'r_0_0',0);
 assert.equal(state.active.length,2);
 assert.equal(api.planSets('seed-1',0)[0],undefined);
 assert.equal(api.planSets('seed-1',0)[1].weight,51);
 assert.equal(api.planSets('seed-1',0)[2].weight,52);
 api.togglePlanRow('seed-1',0,'r_0_0',0);
 assert.equal(api.planSets('seed-1',0)[0].weight,50);
 assert.equal(api.planSets('seed-1',0)[2].weight,52);
});
test('manual completion toggle only changes the selected exercise',()=>{
 const {api,state,elements}=setup();state.activePlan=null;
 for(const id of ['seed-1','seed-2']){
  elements['m_'+id+'_0_w']={value:'60'};elements['m_'+id+'_0_r']={value:'10'};
  api.toggleManualRow(id,0);
 }
 api.toggleManualRow('seed-2',0);
 assert.equal(state.active.length,1);
 assert.equal(api.manualSetRows('seed-1')[0].weight,60);
 assert.equal(api.manualSetRows('seed-2').length,0);
 api.toggleManualRow('seed-2',0);
 assert.equal(state.active.length,2);
});
test('additional exercise can be unchecked and checked without changing planned set',()=>{
 const {api,state,elements}=setup();
 api.addPlanExtraExercise('seed-3');
 state.active.push({exerciseId:'seed-1',name:'seed-1',weight:65,reps:8});
 elements['m_seed-3_0_w']={value:'35'};
 elements['m_seed-3_0_r']={value:'12'};
 api.toggleManualRow('seed-3',0);
 assert.equal(state.active.length,2);
 api.toggleManualRow('seed-3',0);
 assert.equal(state.active.length,1);
 assert.equal(state.active[0].exerciseId,'seed-1');
 api.toggleManualRow('seed-3',0);
 assert.equal(state.active.length,2);
});
test('legacy active sets retain ownership of their planned exercise',()=>{
 const {api,state}=setup();
 state.active.push({exerciseId:'seed-1',name:'seed-1',weight:55,reps:10});
 assert.equal(api.planSets('seed-1',0)[0].weight,55);
 assert.equal(api.planSets('seed-2',1).length,0);
 assert.equal(state.active[0].planSlotIndex,0);
});
