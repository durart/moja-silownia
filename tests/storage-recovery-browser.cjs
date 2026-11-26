const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{const p=new URL(req.url,'http://localhost').pathname;const f=path.resolve(root,'.'+p);if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',/\.(m?js)$/.test(f)?'text/javascript':f.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(f).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch();
 try{
 for(const prefix of ['', 'preview/']){
 const key=prefix?'moja-silownia-preview-v01':'moja-silownia-v01',url='http://127.0.0.1:'+server.address().port+'/'+prefix+'index.html';
 const backup=JSON.stringify({exercises:[],active:[],sessions:[],plans:[{id:'recovery-test',name:'Recovery',targets:[]}]});
 for(const scenario of ['read','corrupt','missing','restore','cancel','write','archive','first']){
 const context=await browser.newContext({serviceWorkers:'block'});const page=await context.newPage();
 await page.addInitScript(({key,backup,scenario})=>{
 if(sessionStorage.getItem('initialized'))return;
 sessionStorage.setItem('initialized','1');
 localStorage.setItem('isolation-sentinel','unchanged');
 if(scenario!=='first'){if(scenario!=='missing')localStorage.setItem(key,scenario==='read'?backup:'{broken');localStorage.setItem(key+'-previous-valid',backup);}
 const get=Storage.prototype.getItem,set=Storage.prototype.setItem;
 if(scenario==='read'){let failed=false;Storage.prototype.getItem=function(k){if(k===key&&!failed){failed=true;throw Error('Injected read failure');}return get.call(this,k);};}
 if(scenario==='write'||scenario==='archive')Storage.prototype.setItem=function(k,v){if(k===(scenario==='archive'?key+'-recovery-original':key))throw Error('Injected write failure');return set.call(this,k,v);};
 },{key,backup,scenario});
 page.on('dialog',d=>scenario==='cancel'?d.dismiss():d.accept());
 await page.goto(url);
 if(scenario==='first'){assert.equal(await page.evaluate(k=>!!localStorage.getItem(k),key),true);}
 else{
 await page.locator('#storageRecoveryPanel').waitFor();
 assert.equal(await page.evaluate(()=>save()),false);
 if(['restore','cancel','write','archive'].includes(scenario)){
 await page.getByRole('button',{name:'Przywróć poprawną kopię'}).click();
 if(scenario==='restore'){await page.waitForFunction(()=>typeof state !== 'undefined' && !storageRecoveryBlocked && !document.getElementById('storageRecoveryPanel'));assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).plans.some(p=>p.id==='recovery-test'),key),true);assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k+'-recovery-original')).primary,key),'{broken');}
 }
 if(scenario!=='restore')assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),scenario==='read'?backup:scenario==='missing'?null:'{broken');
 }
 if(scenario==='first'||scenario==='restore'){
 const result=await page.evaluate(k=>{
  const before=localStorage.getItem(k),previous=localStorage.getItem(k+'-previous-valid');
  const old=state.active;state.active=[null];
  try{return {saved:save(),unchanged:localStorage.getItem(k)===before,backupUnchanged:localStorage.getItem(k+'-previous-valid')===previous};}
  finally{state.active=old;}
 },key);
 assert.deepEqual(result,{saved:false,unchanged:true,backupUnchanged:true});
 console.log(prefix,'invalid persistence PASS');
 if(scenario==='first'){
 const result=await page.evaluate(k=>{
 const original=Storage.prototype.setItem;
 const before=JSON.stringify(state),raw=localStorage.getItem(k);
 Storage.prototype.setItem=function(name,value){if(name===k)throw Error('Injected workout failure');return original.call(this,name,value);};
 try{startManualWorkoutNow();return {memory:JSON.stringify(state)===before,disk:localStorage.getItem(k)===raw};}
 finally{Storage.prototype.setItem=original;}
 },key);
 assert.deepEqual(result,{memory:true,disk:true});
 await page.evaluate(()=>startManualWorkoutNow());
 const started=await page.evaluate(()=>state.startedAt);
 await page.reload();
 assert.equal(await page.evaluate(()=>state.startedAt),started);
 assert.equal(await page.evaluate(()=>state.manualStarted),true);
 console.log(prefix,'workout start rollback and reload PASS');
 }
 }
 assert.equal(await page.evaluate(()=>localStorage.getItem('isolation-sentinel')),'unchanged');
 assert.equal(await page.evaluate(k=>localStorage.getItem(k),prefix?'moja-silownia-v01':'moja-silownia-preview-v01'),null);
 console.log(prefix,scenario,'PASS');await context.close();
 }
 }
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
