'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  for(const accepted of [true,false]){
   const choiceContext=await browser.newContext();
   try{
    const choicePage=await choiceContext.newPage();
    await choicePage.goto('http://127.0.0.1:8765/preview/');
    await choicePage.evaluate(()=>openPreWorkout('manual',null));
    await choicePage.locator('#preSleep').fill('4');
    const dialogPromise=choicePage.waitForEvent('dialog').then(async dialog=>{
      assert.match(dialog.message(),/Asystent zaleca trening regeneracyjny/);
      if(accepted) await dialog.accept(); else await dialog.dismiss();
    });
    await Promise.all([dialogPromise,choicePage.locator('#preWorkout button[onclick="confirmWorkoutStart()"]').click()]);
    assert.equal(await choicePage.locator('#activeRecoveryMode').isChecked(),accepted);
   }finally{await choiceContext.close();}
  }
  const context=await browser.newContext({serviceWorkers:'allow'});
  const page=await context.newPage();
  const base='http://127.0.0.1:8765';
  await page.goto(base+'/preview/');
  await page.waitForFunction(()=>navigator.serviceWorker.controller!==null,{},{timeout:60000}).catch(async()=>{await page.reload();await page.waitForFunction(()=>navigator.serviceWorker.controller!==null,{},{timeout:60000});});
  const result=await page.evaluate(()=>{
   const now=Date.now();
   const exercise={id:'bench',equipmentType:'barbell'};
   const target={sets:2,reps:'8-12',rir:2};
   const sessions=[0,4,8].map(d=>({date:new Date(now-d*86400000).toISOString(),sets:[70,65].map((weight,i)=>({exerciseId:'bench',planId:'A',planSlotIndex:0,planSetIndex:i,weight,reps:i?10:12,rir:3,setType:'W'}))}));
   const state={startedAt:'test',activePlan:'A',activeSessionMode:'standard',exercises:[exercise],sessions};
   const before=JSON.stringify(sessions);
   const drafts=globalThis.MojaTrainerDrafts;
   drafts.initialize(state);
   const entry=drafts.ensure(state,'bench',0,target).entry;
   const initial=entry.rows[0].weight;
   const explanation=globalThis.MojaAdaptiveExplanation.label(entry.rows[0].explanation);
   drafts.change(state,'bench',0,0,'weight',67.5);
   const edited=drafts.ensure(state,'bench',0,target).entry.rows[0].weight;
   return {initial,edited,explanation,cleared:!entry.rows[0].explanation,unchanged:before===JSON.stringify(sessions)};
  });
  assert.deepEqual(result,{initial:72.5,edited:67.5,explanation:'Zwiększenie ciężaru · Porównywalne treningi: 3 · Wiarygodność: umiarkowana',cleared:true,unchanged:true});
  await page.evaluate(()=>{
    const now=Date.now(),id='adaptive-dom-bench';
    state.exercises.push({id,name:'Test bench',group:'Klatka',equipment:'Sztanga',equipmentType:'barbell'});
    state.plans.push({id:'adaptive-dom-plan',name:'Test DOM',exerciseIds:[id],targets:[{sets:2,reps:'8-12',rir:2}]});
    state.sessions=[0,4,8].map(d=>({date:new Date(now-d*86400000).toISOString(),sets:[70,65].map((weight,i)=>({exerciseId:id,planId:'adaptive-dom-plan',planSlotIndex:0,planSetIndex:i,weight,reps:i?10:12,rir:3,setType:'W'}))}));
    state.activePlan='adaptive-dom-plan';state.startedAt=new Date().toISOString();state.active=[];state.activeSessionMode='standard';state.activeExerciseNotes={};state.hiddenWorkoutSlots=[];state.workoutSwaps={};state.preWorkout={};state.trainerSettings={};
    MojaTrainerDrafts.initialize(state);tab('workout');renderPlanWorkout();
  });
  const card=page.locator('[data-workout-slot="0"]');
  assert.match(await card.locator('.adaptive-exercise-explanation').textContent(),/Zalecenia adaptacyjne dla 2 serii/);
  assert.match(await card.locator('.adaptive-explanation').first().textContent(),/Zwiększenie ciężaru/);
  await card.locator('#r_0_0_w').waitFor({state:'visible'});
  await card.locator('#r_0_0_w').fill('67.5');
  assert.equal(await card.locator('.hevy-set').first().locator('.adaptive-explanation').count(),0);
  await page.evaluate(()=>{state.activeSessionMode='recovery';renderPlanWorkout();});
  assert.match(await card.locator('.adaptive-exercise-explanation').textContent(),/Tryb regeneracyjny/);
  assert.equal(await card.locator('#r_0_0_w').inputValue(),'67.5');
  await page.evaluate(()=>{state.activeExerciseNotes['adaptive-dom-bench']={flag:'pain'};MojaTrainerWorkoutUI.caution('adaptive-dom-bench',document.querySelector('[data-workout-slot="0"]'));renderPlanWorkout();});
  assert.match(await card.locator('.adaptive-exercise-explanation').textContent(),/Sprawdź bezpieczeństwo/);
  assert.equal(await card.locator('.adaptive-explanation').count(),0);
  console.log('Adaptive DOM explanations, manual edit, recovery and safety passed');
  await page.evaluate(()=>localStorage.setItem('moja-silownia-v01','adaptive-browser-sentinel'));
  assert.equal(await page.evaluate(()=>globalThis.MojaAdaptiveRecovery.recommend({readinessCaution:true}).requiresConfirmation),true);
  await context.setOffline(true);
  await page.reload({waitUntil:'load'});
  assert.equal(await page.evaluate(()=>typeof globalThis.MojaAdaptiveAdapter?.suggest),'function');
  assert.equal(await page.evaluate(()=>typeof globalThis.MojaAdaptiveRecovery?.prescribe),'function');
  assert.equal(await page.evaluate(()=>globalThis.MojaAdaptiveTrends.classify([20,20,20,20].map(reps=>({reps,reserve:4}))).status),'stagnation');
  assert.equal(await page.evaluate(()=>localStorage.getItem('moja-silownia-v01')),'adaptive-browser-sentinel');
  assert.ok(await page.evaluate(async()=> (await caches.keys()).includes('moja-silownia-preview-shell-v61-4.1.0-alpha5')));
  console.log('Adaptive browser, manual edit, offline reload and production storage sentinel passed');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
