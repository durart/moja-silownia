'use strict';
const release=require('./release-surfaces.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const production=process.env.CARDIO_SURFACE==='production';
const storageKey=production?'moja-silownia-v01':'moja-silownia-preview-v01',otherKey=production?'moja-silownia-preview-v01':'moja-silownia-v01';
const ids=['cardio-treadmill-walk','cardio-treadmill-run','cardio-bike','cardio-stairmaster','cardio-elliptical','cardio-rowing'];
async function open(card){
 const toggle=card.locator('.compact-card-toggle');await toggle.waitFor();
 if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
}
async function verify(card,id){
 await open(card);
 assert.equal(await card.locator('img.cardio-thumbnail').count(),1,id);
 assert.ok(await card.locator('img.cardio-thumbnail').evaluate(img=>img.complete&&img.naturalWidth>0),id+' image loaded');
 assert.equal(await card.locator('[data-cardio-field="durationSeconds"]').count(),1,id);
 assert.equal(await card.locator('button[data-cardio-action="start"]').count(),1,id);
 assert.equal(await card.locator('.hevy-set,.set-grid,input[id$="_w"],input[id$="_r"],select[id$="_rir"],.advisor-progression').count(),0,id+' no strength UI');
}
(async()=>{
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+(url.endsWith('/')?url+'index.html':url));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  try{
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
   await page.addInitScript(({storageKey,otherKey})=>{
    if(!localStorage.getItem(storageKey))localStorage.setItem(storageKey,JSON.stringify({exercises:[{id:'old-elliptical',name:'Orbitrek',group:'Kardio',equipment:'Orbitrek'},{id:'seed-0',name:'Wyciskanie sztangi na ławce płaskiej',group:'Klatka piersiowa',equipment:'Sztanga'}],plans:[{id:1,name:'Stary plan',exerciseIds:['old-elliptical']}],active:[],sessions:[]}));
    localStorage.setItem(otherKey,'production-sentinel');
   },{storageKey,otherKey});
   await page.goto('http://127.0.0.1:'+server.address().port+(production?'/':'/preview/'));
   await page.waitForFunction(()=>!!window.MojaCardioWorkout&&!!document.getElementById('compactWorkoutDock'));
   assert.match(await page.title(),production?release.versionPattern('production','v',' — Programy treningowe'):release.versionPattern('preview','TEST v',' — Katalog ćwiczeń'));
   assert.equal(await page.evaluate(()=>state.plans[0].exerciseIds[0]),'cardio-elliptical');
   await page.evaluate(()=>{tab('catalog');uiCatalogChoose('__cardio__');});
   const rows=page.locator('#catalogList .catalog-exercise-main');
   assert.equal(await rows.count(),6);
   for(const id of ids){
    const row=page.locator('#catalogList .catalog-exercise-main[data-id="'+id+'"]');
    const img=row.locator('img.r6-exercise-art');await img.scrollIntoViewIfNeeded();await img.evaluate(img=>img.decode());assert.ok(await img.evaluate(img=>img.naturalWidth>0));
    await row.click();
   }
   await page.evaluate(()=>{tab('plans');showPlansPanel('mine');});
   await page.locator('#planName').fill('Kardio wszystkie');
   await page.locator('#planSaveButton').click();
   assert.equal(await page.evaluate(()=>state.plans.at(-1).exerciseIds.length),6);
   await page.evaluate(()=>{startPlan(state.plans.length-1);confirmWorkoutStart();});
   for(const id of ids){const card=page.locator('#planWorkout [data-cardio-id="'+id+'"]');await verify(card,id);}
   const walk=page.locator('#planWorkout [data-cardio-id="cardio-treadmill-walk"]');await open(walk);
   await walk.locator('[data-cardio-field="durationSeconds"]').fill('30');
   await walk.locator('[data-cardio-field="speedKmh"]').fill('5.5');
   await walk.locator('[data-cardio-field="inclinePercent"]').fill('10');
   await walk.locator('[data-cardio-action="save"]').click();
   assert.equal(await page.evaluate(()=>state.active.length),0);
   assert.equal(await page.evaluate(()=>state.activeCardio[0].distanceMeters),2750);
   await page.evaluate(()=>finishWorkout());
   assert.equal(await page.evaluate(()=>state.sessions[0].cardio.length),1);
   await page.evaluate(()=>{tab('workout');startManualWorkout();confirmWorkoutStart();pickerOpen();pickerChoose('__cardio__');});
   assert.equal(await page.locator('#pickResults .pick-exercise').count(),6);
   const pick=page.locator('#pickResults .pick-exercise[data-pick-id="cardio-elliptical"]');
   await pick.locator('img.r6-exercise-art').evaluate(img=>img.decode());await pick.click();
   await verify(page.locator('#today [data-cardio-id="cardio-elliptical"]'),'cardio-elliptical');
   await page.evaluate(async()=>await navigator.serviceWorker.ready);
   await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
   await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});
   await verify(page.locator('#today [data-cardio-id="cardio-elliptical"]'),'cardio-elliptical');
   {
    // Exercise swap must use the existing picker, even with the installed app offline.
    await page.evaluate(()=>{pickerOpen();document.getElementById('pickSearch').value='Wyciskanie sztangi na ławce płaskiej';pickerRender();});
    await page.locator('#pickResults .pick-exercise[data-pick-id="seed-0"]').click();
    await page.evaluate(()=>openSwap('manual',null,'seed-0'));
    const atlas=page.locator('#swapAtlas'),similar=page.locator('#swapSimilar');
    assert.equal(await atlas.evaluate(el=>el.open),false);
    assert.equal(await similar.evaluate(el=>el.open),false);
    await similar.locator('summary').click();
    const option=similar.locator('button[data-swap-id]').first();
    await option.waitFor({state:'visible'});
    assert.equal(await option.locator('.swap-thumb').count(),1);
    assert.equal(await option.locator('.swap-thumb img,.swap-thumb svg,.swap-thumb .ui-thumb-sprite,.swap-thumb .ui-thumb-fallback').count(),1);
    assert.match(await option.locator('.swap-score').innerText(),/dopasowania/);
    await atlas.locator('summary').click();
    await page.waitForFunction(()=>document.getElementById('swapAtlas').open&&!document.getElementById('swapSimilar').open&&!document.getElementById('exercisePicker').hidden);
    const next=await page.evaluate(()=>state.exercises.find(e=>e.group==='Plecy'&&!manualIds().includes(e.id)));
    assert.ok(next,'a replacement from another muscle group exists');
    await page.locator('#pickSearch').fill(next.name);
    const replacement=page.locator('#pickResults .pick-exercise').filter({hasText:next.name}).first();
    assert.equal(await replacement.getAttribute('data-pick-id'),next.id);
    await replacement.click();
    await page.waitForFunction(()=>document.getElementById('swapOverlay').classList.contains('hidden'));
    assert.equal(await page.evaluate(id=>manualIds().includes(id),next.id),true);
    assert.equal(await page.evaluate(()=>manualIds().includes('seed-0')),false);
    assert.equal(await page.evaluate(()=>state.plans[0].exerciseIds[0]),'cardio-elliptical');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(id=>typeof manualIds==='function'&&manualIds().includes(id),next.id);
    assert.equal(await page.evaluate(()=>manualIds().includes('seed-0')),false);
    console.log('Offline exercise swap, thumbnail, collapsible sections and persistence verified.');
   }
   assert.equal(await page.evaluate(key=>localStorage.getItem(key),otherKey),'production-sentinel');
   assert.deepEqual(errors,[]);
   console.log('All six cardio atlas icons, saved plan cards, picker and offline state verified.');
  }finally{await context.close();}
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
