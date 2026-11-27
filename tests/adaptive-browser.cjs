'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
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
   drafts.change(state,'bench',0,0,'weight',67.5);
   const edited=drafts.ensure(state,'bench',0,target).entry.rows[0].weight;
   return {initial,edited,unchanged:before===JSON.stringify(sessions)};
  });
  assert.deepEqual(result,{initial:72.5,edited:67.5,unchanged:true});
  await page.evaluate(()=>localStorage.setItem('moja-silownia-v01','adaptive-browser-sentinel'));
  await context.setOffline(true);
  await page.reload({waitUntil:'load'});
  assert.equal(await page.evaluate(()=>typeof globalThis.MojaAdaptiveAdapter?.suggest),'function');
  assert.equal(await page.evaluate(()=>localStorage.getItem('moja-silownia-v01')),'adaptive-browser-sentinel');
  assert.ok(await page.evaluate(async()=> (await caches.keys()).includes('moja-silownia-preview-shell-v58-4.1.0-alpha2')));
  console.log('Adaptive browser, manual edit, offline reload and production storage sentinel passed');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
