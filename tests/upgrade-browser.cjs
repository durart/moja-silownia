'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const legacy=path.resolve(process.env.LEGACY_APP),candidate=path.resolve(__dirname,'..');
let root=legacy,rollback=false;
const rollbackCache='moja-silownia-shell-rollback-test';
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Type',/\.(m?js)$/.test(file)?'text/javascript':file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/octet-stream');
 if(root===legacy&&pathname==='/sw.js'&&rollback){return res.end(fs.readFileSync(file,'utf8').replace(/const CACHE='[^']+'/ , "const CACHE='"+rollbackCache+"'"));}
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch();
 try{
 const context=await browser.newContext({serviceWorkers:'allow',acceptDownloads:true});
 let page=await context.newPage();const url='http://127.0.0.1:'+server.address().port+'/';
 await page.goto(url);assert.match(await page.title(),/v4\.0\.0/);
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
 await page.reload();
 await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
 const before=await page.evaluate(()=>{
  const id=state.exercises[0].id;
  state.plans.push({id:'upgrade-plan',name:'Upgrade test',exerciseIds:[id],targets:[{sets:2,reps:'8-12',rir:2}]});
  state.sessions.push({id:'upgrade-history',date:new Date().toISOString(),sets:[{exerciseId:id,weight:40,reps:10,rir:2,setType:'W'}]});
  state.trainerSettings={weights:true,reps:true,sets:true,explanation:false};
  startManualWorkoutNow();
  state.active.push({exerciseId:id,weight:40,reps:8,rir:0,setType:'W',at:new Date().toISOString()});
  if(!save())throw Error('Legacy save failed');
  localStorage.setItem('moja-silownia-preview-v01','upgrade-sentinel');
  return JSON.parse(JSON.stringify({startedAt:state.startedAt,active:state.active,sessions:state.sessions,plans:state.plans,trainerSettings:state.trainerSettings}));
 });
 const download=page.waitForEvent('download');await page.evaluate(()=>exportData());const backup=await download;const backupPath=await backup.path();assert.ok(fs.statSync(backupPath).size>0);
 root=candidate;
 await page.evaluate(async()=>{const r=await navigator.serviceWorker.ready;await r.update();});
 await page.waitForFunction(async()=> (await caches.keys()).includes('moja-silownia-shell-v62-4.1.0-rc1'),{},{timeout:60000});
 await page.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration();return !!r?.waiting;},{},{timeout:60000});
 await page.close();page=await context.newPage();await page.goto(url);
 await page.waitForFunction(()=>navigator.serviceWorker.controller!==null&&document.title.includes('4.1.0-rc.1'),{},{timeout:60000});
 await page.waitForFunction(async()=>!(await caches.keys()).some(k=>k.startsWith('moja-silownia-shell-')&&k!=='moja-silownia-shell-v62-4.1.0-rc1'));
 const snapshot=()=>page.evaluate(()=>JSON.parse(JSON.stringify({startedAt:state.startedAt,active:state.active,sessions:state.sessions,plans:state.plans,trainerSettings:state.trainerSettings})));
 assert.deepEqual(await snapshot(),before);
 await context.setOffline(true);await page.reload();assert.deepEqual(await snapshot(),before);
 assert.equal(await page.evaluate(()=>localStorage.getItem('moja-silownia-preview-v01')),'upgrade-sentinel');
 await context.setOffline(false);
 page.on('dialog',d=>d.accept());
 await page.evaluate(async text=>{await importData({target:{files:[new File([text],'legacy.json',{type:'application/json'})],value:''}});},fs.readFileSync(backupPath,'utf8'));
 assert.deepEqual(await snapshot(),before);
 console.log('Production 4.0.0 to RC.1 upgrade, backup import, offline and isolation PASS');
 const updated=await page.evaluate(()=>{
  state.active.push({...state.active[0],weight:42.5,reps:7,rir:0,at:new Date().toISOString()});
  if(!save())throw Error('Candidate save failed');
  return JSON.parse(JSON.stringify({startedAt:state.startedAt,active:state.active,sessions:state.sessions,plans:state.plans,trainerSettings:state.trainerSettings}));
 });
 root=legacy;rollback=true;
 await page.evaluate(async()=>{const r=await navigator.serviceWorker.ready;await r.update();});
 await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration())?.waiting,{},{timeout:60000});
 await page.close();page=await context.newPage();await page.goto(url);
 await page.waitForFunction(()=>navigator.serviceWorker.controller!==null&&document.title.includes('4.0.0'),{},{timeout:60000});
 await page.waitForFunction(async name=>(await caches.keys()).includes(name)&&!(await caches.keys()).includes('moja-silownia-shell-v62-4.1.0-rc1'),rollbackCache);
 assert.deepEqual(await snapshot(),updated);
 await context.setOffline(true);await page.reload();assert.deepEqual(await snapshot(),updated);
 assert.equal(await page.evaluate(()=>localStorage.getItem('moja-silownia-preview-v01')),'upgrade-sentinel');
 console.log('Rollback to 4.0.0 with candidate-created data, offline and isolation PASS');
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
