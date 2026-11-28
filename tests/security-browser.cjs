const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname,'..');
const deadline=setTimeout(()=>{console.error('Security browser test exceeded 180 seconds');process.exit(1);},180000);
const log=message=>console.log('[security-browser] '+message);
(async()=>{
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){console.error('HTTP 404:',pathname);res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.mjs')||file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':'application/octet-stream');
  fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true});
 try {
  const context=await browser.newContext();
  for(const prefix of ['', 'preview/']){
   await context.setOffline(false);
   const page=await context.newPage();
   log('Starting '+(prefix||'candidate'));
   page.setDefaultTimeout(30000);
   page.on('console',message=>log(message.text()));
   page.on('pageerror',error=>console.error('Page error:',error.message));
   page.on('requestfailed',request=>console.error('Request failed:',request.url(),request.failure()?.errorText));
   page.on('dialog',dialog=>dialog.accept());
   await page.goto('http://127.0.0.1:'+server.address().port+'/'+prefix+'index.html');
   log('Registering service worker');
   await page.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');});
   await page.waitForFunction(async()=>{const registration=await navigator.serviceWorker.getRegistration();if(registration?.installing?.state==='redundant')throw Error('Service worker installation failed');return registration?.active?.state==='activated';},null,{timeout:45000});
   log('Service worker activated');
   await page.reload();
   await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
   const fixtures=await page.evaluate(async()=>Promise.all(['plan.docx','plan.pdf'].map(async name=>Array.from(new Uint8Array(await (await fetch('/dependency-check/fixtures/'+name)).arrayBuffer())))));
   log('Fixtures loaded; switching offline');
   await page.context().setOffline(true);
   await page.reload();
   const result=await page.evaluate(async fixtures=>{
    console.log('Reading DOCX');
    const text=await impRead(new File([new Uint8Array(fixtures[0])],'plan.docx'));
    let malformedRejected=false;try{await impRead(new File([new Uint8Array([0,1,2,3])],'invalid.docx'));}catch(e){malformedRejected=/archiwum DOCX/.test(String(e));}
    if(!malformedRejected)throw Error('Malformed DOCX accepted');
    console.log('Reading PDF');
    await impRead(new File([new Uint8Array(fixtures[1])],'plan.pdf'));
    console.log('Checking XSS and saving plan');
    const host=document.createElement('div');
    window.__securityProbe=0;
    host.innerHTML='<button onclick="window.__securityProbe=1" data-action-exercise-id="'+safe("' onclick='window.__securityProbe=2")+'">test</button>';
    document.body.append(host);
    const id=host.firstElementChild.dataset.actionExerciseId;
    host.firstElementChild.click();
    const probe=window.__securityProbe;
    host.remove();
    const name='Security test '+String(Date.now());
    importedDraft=[{name,rows:[{name:'Bench press',action:'new',series:3,reps:'10',weight:'40',group:'Inne'}]}];
    impRender();
    impSave();
    const key=location.pathname.startsWith('/preview/')?'moja-silownia-preview-v01':'moja-silownia-v01';
    const stored=JSON.parse(localStorage.getItem(key));
    return {text,id,probe,saved:stored.plans.some(p=>p.name===name&&p.targets[0].sets===3&&p.targets[0].reps==='10')};
   },fixtures);
   assert.match(result.text,/TRENING 1/);
   assert.match(result.text,/Bench press/);
   assert.equal(result.id,"' onclick='window.__securityProbe=2");
   assert.equal(result.probe,1);
   assert.equal(result.saved,true);
   log('Passed '+(prefix||'candidate'));
   await page.close();
  }
  await context.setOffline(false);
  const isolation=await context.newPage();
  await isolation.goto('http://127.0.0.1:'+server.address().port+'/index.html');
  const keys=await isolation.evaluate(()=>['moja-silownia-v01','moja-silownia-preview-v01'].map(key=>JSON.parse(localStorage.getItem(key)).plans.filter(p=>p.name.startsWith('Security test ')).map(p=>p.name)));
  assert.equal(keys[0].length,1);
  assert.equal(keys[1].length,1);
  assert.notEqual(keys[0][0],keys[1][0]);
  log('Storage isolation passed');
  await context.close();
  {
  }
 } finally {await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>clearTimeout(deadline));
