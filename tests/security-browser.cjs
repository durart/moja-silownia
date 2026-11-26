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
   await page.route('**/pdfjs-dist@6.5.438/legacy/build/*',route=>route.fulfill({path:path.join(root,'dependency-check/node_modules/pdfjs-dist/legacy/build',new URL(route.request().url()).pathname.split('/').pop()),contentType:'text/javascript',headers:{'access-control-allow-origin':'*'}}));
   await page.route('**/mammoth/1.9.0/mammoth.browser.min.js',route=>route.fulfill({path:path.join(root,'dependency-check/node_modules/mammoth/mammoth.browser.min.js'),contentType:'text/javascript'}));
   await page.goto('http://127.0.0.1:'+server.address().port+'/'+prefix+'index.html');
   const result=await page.evaluate(async()=>{
    const response=await fetch('/dependency-check/fixtures/plan.docx');
    const text=await impRead(new File([await response.arrayBuffer()],'plan.docx'));
    const pdf=await fetch('/dependency-check/fixtures/plan.pdf');
    await impRead(new File([await pdf.arrayBuffer()],'plan.pdf'));
    const host=document.createElement('div');
    window.__securityProbe=0;
    host.innerHTML='<button onclick="window.__securityProbe=1" data-action-exercise-id="'+safe("' onclick='window.__securityProbe=2")+'">test</button>';
    document.body.append(host);
    const id=host.firstElementChild.dataset.actionExerciseId;
    host.remove();
    return {text,id,probe:window.__securityProbe};
   });
   assert.match(result.text,/TRENING 1/);
   assert.match(result.text,/Bench press/);
   assert.equal(result.id,"' onclick='window.__securityProbe=2");
   assert.equal(result.probe,0);
   await page.close();
  }
 } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
