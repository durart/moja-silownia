'use strict';
// A-24: characterize the actual legacy card and application event, not target behavior.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base='http://127.0.0.1:8765/';
async function setup(page,mode){
 await page.evaluate(mode=>{
  const id='seed-0',planId='characterization-plan',now=Date.now();
  state.sessions=[0,4,8].map(days=>({date:new Date(now-days*86400000).toISOString(),sessionMode:'standard',sets:[0,1].map(i=>({exerciseId:id,planId,planSlotIndex:0,planSetIndex:i,weight:70,reps:12,rir:3,setType:'W'}))}));
  state.plans.push({id:planId,name:'Synthetic legacy plan',exerciseIds:[id],targets:[{sets:2,reps:'8-12',rir:2}]});
  Object.assign(state,{activePlan:planId,startedAt:new Date(now).toISOString(),active:[],manualStarted:false,activeSessionMode:mode,activeExerciseNotes:{},hiddenWorkoutSlots:[],workoutSwaps:{},preWorkout:{},planRowCounts:{},trainerSettings:{}});
  delete state.trainerWorkout;
  tab('workout');renderPlanWorkout();
 },mode);
 assert.equal(await page.evaluate(()=>MojaTrainerDrafts.active(state)),false);
 const card=page.locator('[data-workout-slot="0"]');
 const button=card.locator('.advisor-progression button').filter({hasText:'Ustaw 72.5 kg w tym treningu'});
 await button.waitFor({state:'attached'});
 assert.equal(await button.count(),1);
 assert.equal(await card.locator('#r_0_0_w').inputValue(),'70');
 return {card,button,before:await page.evaluate(()=>JSON.stringify({sessions:state.sessions,plans:state.plans,active:state.active}))};
}
async function apply(page,fixture){
 const dialog=page.waitForEvent('dialog').then(async d=>{assert.equal(d.type(),'confirm');assert.match(d.message(),/72\.5 kg/);await d.accept();});
 await Promise.all([dialog,fixture.button.evaluate(button=>button.click())]);
 assert.equal(await fixture.card.locator('#r_0_0_w').inputValue(),'72.5');
 assert.equal(await page.evaluate(()=>JSON.stringify({sessions:state.sessions,plans:state.plans,active:state.active})),fixture.before);
}
(async()=>{
 const browser=await chromium.launch();
 try{
  for(const prefix of ['', 'preview/']){
   for(const scenario of ['recovery','readiness-changed']){
    const context=await browser.newContext();
    try{
     const page=await context.newPage();
     await page.goto(base+prefix);
     await page.waitForFunction(()=>window.MojaSilowniaModules&&window.__mojaAdvisorProgressionReady&&window.MojaTrainerDrafts);
     const fixture=await setup(page,scenario==='recovery'?'recovery':'standard');
     if(scenario==='readiness-changed')await page.evaluate(()=>{state.preWorkout={sleepHours:4};});
     await apply(page,fixture);
     console.log('CHARACTERIZED A-24',prefix||'production/',scenario,'legacy card sets 72.5 kg in an unsaved row; raw history unchanged');
    }finally{await context.close();}
   }
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
