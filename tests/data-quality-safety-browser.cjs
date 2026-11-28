'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base='http://127.0.0.1:8765/preview/';
async function setup(page,mode){
 await page.goto(base);
 await page.waitForFunction(()=>window.MojaSilowniaModules&&window.MojaRecommendationSafety&&window.MojaTrainerDrafts&&window.__mojaAdvisorProgressionReady);
 await page.evaluate(mode=>{
  const id='seed-0',planId='safety-plan',now=Date.now();
  state.sessions=[0,4,8].map(days=>({date:new Date(now-days*86400000).toISOString(),sessionMode:'standard',sets:[0,1].map(i=>({exerciseId:id,planId,planSlotIndex:0,planSetIndex:i,weight:70,reps:12,rir:3,setType:'W'}))}));
  state.plans.push({id:planId,name:'Safety plan',exerciseIds:[id],targets:[{sets:2,reps:'8-12',rir:2}]});
  Object.assign(state,{activePlan:planId,startedAt:new Date(now).toISOString(),active:[],manualStarted:false,activeSessionMode:mode,activeExerciseNotes:{},hiddenWorkoutSlots:[],workoutSwaps:{},preWorkout:{},planRowCounts:{},trainerSettings:{}});
  delete state.trainerWorkout;
  tab('workout');renderPlanWorkout();
 },mode);
 const card=page.locator('[data-workout-slot="0"]');
 await card.locator('.advisor-progression').waitFor();
 return {card,button:card.locator('.advisor-progression button').filter({hasText:'Ustaw 72.5 kg w tym treningu'}),before:await page.evaluate(()=>JSON.stringify({sessions:state.sessions,plans:state.plans,active:state.active}))};
}
async function assertRaw(page,before){assert.equal(await page.evaluate(()=>JSON.stringify({sessions:state.sessions,plans:state.plans,active:state.active})),before);}
(async()=>{
 const browser=await chromium.launch();
 try{
  for(const scenario of ['recovery','readiness-changed','pain-changed','equipment-changed','valid-with-manual-edit']){
   const context=await browser.newContext();
   try{
    const page=await context.newPage();
    const f=await setup(page,scenario==='recovery'?'recovery':'standard');
    if(scenario==='recovery'){
     assert.equal(await f.button.count(),0);
     assert.notEqual(await f.card.locator('#r_0_0_w').inputValue(),'72.5');
    }else{
     await f.button.waitFor({state:'attached'});
     if(scenario==='readiness-changed')await page.evaluate(()=>{state.preWorkout={sleepHours:4};});
     if(scenario==='pain-changed')await page.evaluate(()=>{state.activeExerciseNotes['seed-0']={flag:'pain'};});
     if(scenario==='equipment-changed')await page.evaluate(()=>{state.exercises.find(e=>e.id==='seed-0').equipmentStepKg=20;});
     if(scenario==='valid-with-manual-edit'){
      await f.card.locator('#r_0_1_w').fill('65');
      const dialog=page.waitForEvent('dialog').then(async d=>{assert.equal(d.type(),'confirm');await d.accept();});
      await Promise.all([dialog,f.button.evaluate(button=>button.click())]);
      assert.equal(await f.card.locator('#r_0_0_w').inputValue(),'72.5');
      assert.equal(await f.card.locator('#r_0_1_w').inputValue(),'65');
     }else{
      const dialog=page.waitForEvent('dialog').then(async d=>{assert.equal(d.type(),'alert');await d.accept();});
      await Promise.all([dialog,f.button.evaluate(button=>button.click())]);
      assert.equal(await f.card.locator('#r_0_0_w').inputValue(),'70');
     }
    }
    await assertRaw(page,f.before);
    console.log('PASS legacy recommendation policy:',scenario);
   }finally{await context.close();}
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
