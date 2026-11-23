'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [390,1100]){
   const page=await browser.newPage({viewport:{width,height:844}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setContent('<!doctype html><html lang="pl"><head><meta charset="utf-8"></head><body><main id="progressContent"></main></body></html>');
   await page.evaluate(()=>{
    const now=Date.now();
    window.state={profile:{weightHistory:[{date:new Date(now-86400000*20).toISOString().slice(0,10),weightKg:100}]},exercises:[{id:'bench',name:'Wyciskanie'}],sessions:[0,7,14,21].map((offset,i)=>({date:new Date(now-86400000*(21-offset)).toISOString(),sets:[{exerciseId:'bench',weight:60+i*2,reps:8,rir:1}]}))};
   });
   await page.addScriptTag({path:path.join(root,'assistant/session-mode.js')});
   await page.addScriptTag({path:path.join(root,'progress-core-v2.js')});
   await page.addScriptTag({path:path.join(root,'progress-ui-v2.js')});
   await page.evaluate(()=>{window.renderProgress();window.progressView('exercise');window.progressMetric('relativeOneRM');});
   const circles=page.locator('#progressContent svg circle');
   assert.equal(await circles.count(),4,'relative strength plot points');
   await circles.last().click();
   assert.match(await page.locator('#progressContent').innerText(),/Siła względna/);
   assert.equal(errors.length,0,errors.join('; '));
   await page.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
