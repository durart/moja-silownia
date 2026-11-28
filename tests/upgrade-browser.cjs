'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const release=require('./release-surfaces.cjs');
const previous={version:process.env.LEGACY_VERSION||'4.1.1'};
const target=release.surfaces.production;
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
 await page.goto(url);assert.ok((await page.title()).includes('v'+previous.version));
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
 await page.reload();
 await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
 const before=await page.evaluate(()=>{
  const id='seed-12';
  state.plans.push({id:'upgrade-plan',name:'Upgrade test',exerciseIds:[id],targets:[{sets:2,reps:'8-12',rir:2}]});
  state.sessions.push({id:'upgrade-history',date:new Date().toISOString(),sets:[{exerciseId:id,name:'Wspięcia na palce',weight:30,reps:12,rir:2,setType:'W'}],fatigueModel:2,fatigueImpulse:{Nogi:10},muscles:{Nogi:1}});
  state.trainerSettings={weights:true,reps:true,sets:true,explanation:false};
  startManualWorkoutNow();
  state.active.push({exerciseId:id,weight:40,reps:8,rir:0,setType:'W',manualSetIndex:0,at:new Date().toISOString()});
  state.manualExerciseIds=[id];
  MojaTrainerDrafts.ensure(state,id,null,{sets:3,reps:'8-12',rir:2},[state.active[0]]);
  if(!MojaTrainerDrafts.change(state,id,null,2,'weight','37.5')||!MojaTrainerDrafts.change(state,id,null,2,'reps','9'))throw Error('Legacy draft setup failed');
  if(!save())throw Error('Legacy save failed');
  localStorage.setItem('moja-silownia-preview-v01','upgrade-sentinel');
  return JSON.parse(JSON.stringify({startedAt:state.startedAt,active:state.active,sessions:state.sessions,plans:state.plans,trainerSettings:state.trainerSettings}));
 });
 const download=page.waitForEvent('download');await page.evaluate(()=>exportData());const backup=await download;const backupPath=await backup.path();assert.ok(fs.statSync(backupPath).size>0);
 await page.evaluate(async()=>{await caches.open('moja-silownia-preview-shell-v70-4.1.3-alpha.6');});
 root=candidate;
 await page.evaluate(async()=>{const r=await navigator.serviceWorker.ready;await r.update();});
 await page.waitForFunction(async name=> (await caches.keys()).includes(name),target.cache,{timeout:60000});
 await page.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration();return !!r?.waiting;},{},{timeout:60000});
 await page.close();page=await context.newPage();await page.goto(url);
 await page.waitForFunction(version=>navigator.serviceWorker.controller!==null&&document.title.includes('v'+version),target.version,{timeout:60000});
 await page.waitForFunction(async name=>!(await caches.keys()).some(k=>k.startsWith('moja-silownia-shell-')&&k!==name),target.cache);
 assert.ok(await page.evaluate(async()=> (await caches.keys()).includes('moja-silownia-preview-shell-v70-4.1.3-alpha.6')));
 const snapshot=()=>page.evaluate(()=>JSON.parse(JSON.stringify({startedAt:state.startedAt,active:state.active,sessions:state.sessions,plans:state.plans,trainerSettings:state.trainerSettings})));
 const assertEdited=async()=>{const row=await page.evaluate(()=>MojaTrainerDrafts.row(state,'seed-12',null,2));assert.equal(row.weight,37.5);assert.equal(row.reps,9);assert.equal(row.rir,null);assert.equal(row.edited,true);};
 assert.deepEqual(await snapshot(),before);await assertEdited();
 const mapped=await page.evaluate(()=>({group:state.exercises.find(ex=>ex.id==='seed-12').group,roles:muscleRoles(state.sessions.find(s=>s.id==='upgrade-history')),scores:sessionImpulse(state.sessions.find(s=>s.id==='upgrade-history'))}));
 assert.equal(mapped.group,'Łydki');assert.deepEqual(mapped.roles,{'Łydki':1});assert.ok(mapped.scores['Łydki']>0);assert.equal(mapped.scores.Nogi,undefined);
 await context.setOffline(true);await page.reload();assert.deepEqual(await snapshot(),before);await assertEdited();
 assert.equal(await page.evaluate(()=>localStorage.getItem('moja-silownia-preview-v01')),'upgrade-sentinel');
 await context.setOffline(false);
 page.on('dialog',d=>d.accept());
 await page.evaluate(async text=>{await importData({target:{files:[new File([text],'legacy.json',{type:'application/json'})],value:''}});},fs.readFileSync(backupPath,'utf8'));
 assert.deepEqual(await snapshot(),before);await assertEdited();
 console.log('Production '+previous.version+' to '+target.version+' upgrade, backup import, offline and isolation PASS');
 const updated=await page.evaluate(()=>{
  state.active.push({...state.active[0],weight:42.5,reps:7,rir:0,manualSetIndex:1,at:new Date().toISOString()});
  state.sessions.push({id:'candidate-model4',date:new Date().toISOString(),sets:[{exerciseId:'seed-0',weight:70,reps:10,rir:0,setType:'W'}],fatigueModel:4,fatigueImpulse:{'Klatka piersiowa':15}});
  if(!save())throw Error('Candidate save failed');
  return JSON.parse(JSON.stringify({startedAt:state.startedAt,active:state.active,sessions:state.sessions,plans:state.plans,trainerSettings:state.trainerSettings}));
 });
 root=legacy;rollback=true;
 await page.evaluate(async()=>{const r=await navigator.serviceWorker.ready;await r.update();});
 await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration())?.waiting,{},{timeout:60000});
 await page.close();page=await context.newPage();await page.goto(url);
 await page.waitForFunction(async ({name,candidate})=>(await caches.keys()).includes(name)&&!(await caches.keys()).includes(candidate),{name:rollbackCache,candidate:target.cache},{timeout:60000});
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
 await page.reload();
 await page.waitForFunction(version=>navigator.serviceWorker.controller!==null&&document.title.includes('v'+version),previous.version,{timeout:60000});
 await page.waitForFunction(async ({name,candidate})=>(await caches.keys()).includes(name)&&!(await caches.keys()).includes(candidate),{name:rollbackCache,candidate:target.cache});
 assert.deepEqual(await snapshot(),updated);await assertEdited();
 await context.setOffline(true);await page.reload();assert.deepEqual(await snapshot(),updated);await assertEdited();
 assert.equal(await page.evaluate(()=>localStorage.getItem('moja-silownia-preview-v01')),'upgrade-sentinel');
 assert.ok(await page.evaluate(async()=> (await caches.keys()).includes('moja-silownia-preview-shell-v70-4.1.3-alpha.6')));
 console.log('Production rollback to '+previous.version+' with candidate-created data, offline and isolation PASS');
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
