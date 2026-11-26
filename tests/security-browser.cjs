const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.mjs')||file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':'application/octet-stream');
  fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true});
 try {
  for(const prefix of ['', 'preview/']){
   const page=await browser.newPage();
   page.on('dialog',dialog=>dialog.accept());
   await page.goto('http://127.0.0.1:'+server.address().port+'/'+prefix+'index.html');
   await page.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;});
   await page.reload();
   await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
   const fixtures=await page.evaluate(async()=>Promise.all(['plan.docx','plan.pdf'].map(async name=>Array.from(new Uint8Array(await (await fetch('/dependency-check/fixtures/'+name)).arrayBuffer())))));
   await page.context().setOffline(true);
   await page.reload();
   const result=await page.evaluate(async fixtures=>{
    const text=await impRead(new File([new Uint8Array(fixtures[0])],'plan.docx'));
    await impRead(new File([new Uint8Array(fixtures[1])],'plan.pdf'));
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
   await page.close();
  }
 } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
