'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),key='moja-silownia-v01';
const fixture={exercises:[{id:'seed-13',name:'Pompki',group:'Klatka piersiowa',equipment:'Masa ciała'},{id:'cali-02',name:'Pompki',group:'Kalistenika',equipment:'Masa ciała',steps:['Test'],kind:'push'}],active:[],sessions:[{id:1,date:'2026-11-01T12:00:00Z',sets:[{exerciseId:'cali-02',weight:0,reps:10},{exerciseId:'seed-13',weight:0,reps:12}]}],plans:[{id:1,name:'Test',exerciseIds:['cali-02']}],restSettings:{'cali-02':90}};
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
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.addInitScript(({key,fixture})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(fixture));},{key,fixture});
 const verify=async()=>{
 await page.waitForFunction(()=>typeof state!=='undefined'&&state.exerciseIdentityVersion===1&& !state.exercises.some(e=>e.id==='cali-02'));
 const result=await page.evaluate(()=>({sets:state.sessions[0].sets,plan:state.plans[0].exerciseIds,groups:state.exercises.find(e=>e.id==='seed-13').groups}));
 assert.equal(result.sets.length,2);assert.equal(result.sets.reduce((n,s)=>n+s.reps,0),22);
 assert.deepEqual(result.plan,['seed-13']);assert.ok(result.groups.includes('Kalistenika'));
 };
 await page.goto('http://127.0.0.1:'+server.address().port+'/');await verify();
 assert.ok(await page.evaluate(key=>localStorage.getItem(key+'-before-exercise-identity-v1'),key));
 await page.reload();await verify();
 await page.evaluate(async fixture=>{const input=document.createElement('input');const transfer=new DataTransfer();transfer.items.add(new File([JSON.stringify(fixture)],'backup.json',{type:'application/json'}));input.files=transfer.files;await importData({target:input});},fixture);
 await verify();assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
