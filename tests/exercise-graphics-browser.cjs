'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),key='moja-silownia-v01';
(async()=>{
 const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost').pathname;
 const file=path.resolve(root,'.'+(url.endsWith('/')?url+'index.html':url));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json'};
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url='http://127.0.0.1:'+server.address().port+'/';
 await page.goto(url);
 await page.waitForFunction(()=>typeof state!=='undefined'&&state.exercises.length>0);
 await page.evaluate(()=>openTechnique('seed-0'));
 const image=page.locator('#techContent .r6-tech-art');
 await image.waitFor({state:'visible'});
 await image.evaluate(img=>img.decode());
 assert.equal(await image.evaluate(img=>img.naturalWidth),640);
 assert.equal(await image.evaluate(img=>img.naturalHeight),360);
 assert.ok(await page.locator('#techContent .tech-steps li').count());
 await page.evaluate(()=>{closeTechnique();tab('catalog');selectMuscle('Klatka piersiowa');});
 await page.locator('#catalogList .r6-exercise-art').first().waitFor({state:'visible'});
 await page.locator('#catalogList .r6-exercise-art').first().evaluate(img=>img.decode());
 assert.equal(await page.evaluate(()=>window.ExerciseGraphics.exerciseGraphic('cali-02')),await page.evaluate(()=>window.ExerciseGraphics.exerciseGraphic('seed-13')));
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller,{},{timeout:5000}).catch(async()=>{await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);});
 await context.setOffline(true);
 await page.reload();
 await page.evaluate(()=>openTechnique('seed-0'));
 await page.locator('#techContent .r6-tech-art').evaluate(img=>img.decode());
 assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
