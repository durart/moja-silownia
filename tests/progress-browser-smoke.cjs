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
    window.state={profile:{weightHistory:[{date:new Date(now-86400000*25).toISOString().slice(0,10),weightKg:100}]},exercises:[{id:'bench',name:'Wyciskanie'}],sessions:[0,7,14,21].map((offset,i)=>({date:new Date(now-86400000*(21-offset)).toISOString(),sets:[{exerciseId:'bench',weight:60+i*2,reps:8,rir:1}]}))};
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
  const http=require('node:http'),fs=require('node:fs');
  const server=http.createServer((req,res)=>{
   const pathname=new URL(req.url,'http://localhost').pathname;
   const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
   const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
   res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const context=await browser.newContext({viewport:{width:390,height:844}});
  try{
   const page=await context.newPage(),url='http://127.0.0.1:'+server.address().port+'/';
   await page.goto(url);
   await page.evaluate(async()=>{await caches.open('moja-silownia-shell-test-old');await navigator.serviceWorker.ready;});
   await page.reload();
   await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
   // Store synthetic training history, then verify real navigation on the full PWA.
   await page.evaluate(()=>{
    const exercise=state.exercises[0];
    state.sessions=[{id:901,date:new Date(Date.now()-86400000).toISOString(),durationSeconds:1800,sets:[{exerciseId:exercise.id,name:exercise.name,weight:65,reps:9,rir:2,setType:'W'}]}];
    save();
   });
   await page.getByRole('button',{name:'Postępy',exact:true}).click();
   await page.getByRole('heading',{name:'Podsumowanie',exact:true}).waitFor();
   await page.getByRole('button',{name:'Raporty',exact:true}).click();
   await page.getByRole('heading',{name:'Raport postępów treningowych',exact:true}).waitFor();
   assert.match(await page.locator('#progressContent').innerText(),/585 kg/);
   // Inject the former asset URL with a deliberately stale API into the active cache.
   // A new version must not request this legacy URL, even offline.
   await page.evaluate(async()=>{
    const name=(await caches.keys()).find(n=>n.includes('v44-progress-3.1.1'));
    const cache=await caches.open(name);
    await cache.put(new Request(new URL('progress-core-v2.js?v=3',location.href)),new Response('window.ProgressCore={inPeriod:()=>[]};',{headers:{'Content-Type':'text/javascript'}}));
   });
   const before=await page.evaluate(()=>{const key='moja-silownia-v01';const raw=localStorage.getItem(key);return {raw,cacheNames:null};});
   await context.setOffline(true);
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.ProgressReportDashboard);
   assert.equal(await page.evaluate(()=>localStorage.getItem('moja-silownia-v01')),before.raw,'offline reload preserves local state');
   await page.getByRole('button',{name:'Postępy',exact:true}).click();
   await page.getByRole('heading',{name:'Podsumowanie',exact:true}).waitFor();
   await page.getByRole('button',{name:'Raporty',exact:true}).click();
   await page.getByRole('heading',{name:'Raport postępów treningowych',exact:true}).waitFor();
   assert.match(await page.locator('#progressContent').innerText(),/585 kg/);
   assert.equal(await page.evaluate(()=>localStorage.getItem('moja-silownia-v01')),before.raw,'reports are read-only offline');
   assert.ok((await page.title()).includes('3.1.1'));
   const names=await page.evaluate(()=>caches.keys());
   assert.ok(names.some(n=>n.includes('v44-progress-3.1.1')));
  }finally{await context.close();await new Promise(resolve=>server.close(resolve));}
 }finally{await browser.close();}
})().then(()=>require('./trainer-browser-smoke.cjs')()).catch(error=>{console.error(error);process.exitCode=1;});
