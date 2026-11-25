'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{
  let url=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+(url.endsWith('/')?url+'index.html':url));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [360,390,1100]){
   const context=await browser.newContext({viewport:{width,height:844}});
   try{
    const page=await context.newPage(),url='http://127.0.0.1:'+server.address().port+'/preview/';
    const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
    const seed={exercises:[{id:'bench-test',name:'Wyciskanie testowe',group:'Klatka piersiowa',equipment:'Sztanga'},{id:'row-test',name:'Wiosłowanie testowe',group:'Plecy',equipment:'Maszyna'}],plans:[{id:17,name:'Plan testowy',exerciseIds:['bench-test','row-test','bench-test'],targets:[{sets:1,reps:'10',weight:40},{sets:2,reps:'10',weight:30},{sets:1,reps:'10',weight:20}]}],active:[],sessions:[]};
    await page.addInitScript(seed=>{
      if(!localStorage.getItem('moja-silownia-preview-v01'))localStorage.setItem('moja-silownia-preview-v01',JSON.stringify(seed));
      localStorage.setItem('moja-silownia-v01','production-sentinel');
    },seed);
    await page.goto(url);
    await page.waitForFunction(()=>!!window.MojaTrainerWorkoutUI&&!!document.getElementById('compactWorkoutDock'));
    await page.evaluate(()=>{startPlan(0);confirmWorkoutStart();});
    const first=page.locator('[data-workout-slot="0"]'),second=page.locator('[data-workout-slot="1"]'),third=page.locator('[data-workout-slot="2"]');
    await first.locator('.compact-card-toggle[aria-expanded="true"]').waitFor();
    assert.equal(await second.locator('.compact-card-toggle').getAttribute('aria-expanded'),'false');
    assert.equal(await third.locator('.compact-card-toggle').getAttribute('aria-expanded'),'false');
    const before=await page.evaluate(()=>JSON.stringify(state.active));
    await third.locator('.compact-card-toggle').click();
    assert.equal(await third.locator('.compact-card-toggle').getAttribute('aria-expanded'),'true');
    assert.equal(await first.locator('.compact-card-toggle').getAttribute('aria-expanded'),'false');
    assert.equal(await page.evaluate(()=>JSON.stringify(state.active)),before);
    await first.locator('.compact-card-toggle').click();
    await first.locator('#r_0_0_w').fill('40');
    await first.locator('#r_0_0_r').fill('10');
    await first.locator('button[onclick^="togglePlanRow"]').click();
    await second.locator('.compact-card-toggle[aria-expanded="true"]').waitFor();
    assert.match(await first.locator('.compact-card-status').innerText(),/✓ 1\/1/);
    assert.equal(await first.locator('#r_0_0_w').isVisible(),false);
    assert.equal(await page.evaluate(()=>state.active.length),1);
    const dock=page.locator('#compactWorkoutDock');
    await dock.waitFor();
    assert.equal(await dock.evaluate(el=>getComputedStyle(el).position),'fixed');
    const box=await dock.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=845);
    const deadline=await page.evaluate(()=>state.restUntil);
    await page.locator('#compactRestExtend').click();
    assert.equal(await page.evaluate(()=>state.restUntil),deadline+15000);
    await page.reload();
    await second.locator('.compact-card-toggle[aria-expanded="true"]').waitFor();
    assert.equal(await page.evaluate(()=>state.active.length),1);
    assert.equal(await page.evaluate(()=>state.restUntil),deadline+15000);
    await page.locator('#compactRestSkip').click();
    assert.equal(await page.evaluate(()=>state.restUntil),null);
    await first.locator('.compact-card-toggle').click();
    await first.locator('button[onclick^="togglePlanRow"]').click();
    await first.locator('.compact-card-toggle[aria-expanded="true"]').waitFor();
    assert.equal(await page.evaluate(()=>state.active.length),0);
    assert.match(await first.locator('.compact-card-status').innerText(),/0\/1/);
    await first.locator('.compact-card-toggle').click();
    await page.reload();
    await first.locator('.compact-card-toggle[aria-expanded="false"]').waitFor();
    assert.equal(await page.locator('.compact-card-toggle[aria-expanded="true"]').count(),0);
    assert.equal(await page.evaluate(()=>localStorage.getItem('moja-silownia-v01')),'production-sentinel');
    await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
    await page.reload();
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    await context.setOffline(true);
    await page.reload({waitUntil:'domcontentloaded'});
    await first.locator('.compact-card-toggle[aria-expanded="false"]').waitFor();
    assert.equal(await page.evaluate(()=>state.active.length),0);
    assert.deepEqual(errors,[]);
   }finally{await context.close();}
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
