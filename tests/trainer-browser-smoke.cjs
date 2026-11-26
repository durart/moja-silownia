'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
module.exports=async function trainerBrowserSmoke(){
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [390,1100]){
   const context=await browser.newContext({viewport:{width,height:844}});
   try{
    const page=await context.newPage(),url='http://127.0.0.1:'+server.address().port+'/';
    const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>dialog.accept());
    const seed={exercises:[{id:'bench',name:'Wyciskanie testowe',equipment:'Sztanga',group:'Klatka piersiowa'},{id:'new-exercise',name:'Nowe ćwiczenie',equipment:'Maszyna',group:'Plecy'}],plans:[{id:17,name:'Plan testowy',exerciseIds:['bench'],targets:[{sets:4,reps:'8–12'}]}],active:[],sessions:[{id:1,date:new Date(Date.now()-86400000).toISOString(),sets:[{exerciseId:'bench',weight:20,reps:10,rir:5,setType:'R'},{exerciseId:'bench',weight:60,reps:12,rir:4},{exerciseId:'bench',weight:70,reps:12,rir:4},{exerciseId:'bench',weight:70,reps:12,rir:4}]}]};
    await page.addInitScript(seed=>{if(!localStorage.getItem('moja-silownia-v01'))localStorage.setItem('moja-silownia-v01',JSON.stringify(seed));},seed);
    await page.goto(url);
    await page.waitForFunction(()=>!!window.MojaTrainerWorkoutUI&&!!window.MojaSilowniaModules);
    await page.evaluate(()=>{startPlan(0);confirmWorkoutStart();});
    await page.locator('#r_0_2_w').waitFor();
    assert.equal(await page.locator('#r_0_0_w').inputValue(),'20');
    assert.equal(await page.locator('#r_0_1_w').inputValue(),'60');
    assert.equal(await page.locator('#r_0_2_w').inputValue(),'72.5');
    assert.equal(await page.locator('#r_0_2_rir').inputValue(),'');
    assert.equal(await page.evaluate(()=>state.active.length),0);
    await page.locator('#r_0_2_w').fill('65');
    await page.locator('#r_0_2_r').fill('9');
    await page.evaluate(()=>{tab('dashboard');tab('workout');});
    assert.equal(await page.locator('#r_0_2_w').inputValue(),'65');
    await page.reload();
    await page.waitForFunction(()=>!!window.MojaTrainerWorkoutUI&&!!window.MojaSilowniaModules);
    await page.evaluate(()=>tab('workout'));
    assert.equal(await page.locator('#r_0_2_w').inputValue(),'65');
    assert.equal(await page.locator('#r_0_2_r').inputValue(),'9');
    await page.locator('#r_0_2_rir').selectOption('1');
    await page.evaluate(()=>togglePlanRow('bench',2,'r_0_2',0));
    assert.equal(await page.evaluate(()=>state.active.length),1);
    assert.equal(await page.evaluate(()=>state.active[0].weight),65);
    assert.equal(await page.evaluate(()=>state.active[0].rir),1);
    await page.evaluate(()=>finishWorkout());
    await page.waitForFunction(()=>!state.startedAt);
    assert.equal(await page.evaluate(()=>state.sessions[0].sets.length),1);
    assert.equal(await page.evaluate(()=>state.trainerWorkout),undefined);
    await page.evaluate(()=>{tab('dashboard');startManualWorkout();confirmWorkoutStart();document.getElementById('exercise').value='bench';addManualExercise();});
    assert.equal(await page.locator('#m_bench_0_w').inputValue(),'65');
    assert.equal(await page.locator('#m_bench_0_r').inputValue(),'9');
    await page.evaluate(()=>{document.getElementById('exercise').value='new-exercise';addManualExercise();});
    assert.equal(await page.locator('#m_new-exercise_0_w').inputValue(),'');
    await page.evaluate(()=>{addManualRow('bench');removeManualRow('bench',0);});
    assert.equal(await page.locator('#m_bench_0_w').inputValue(),'65');
    const before=await page.evaluate(()=>localStorage.getItem('moja-silownia-v01'));
    await page.goto(url+'preview/');
    await page.waitForFunction(()=>window.MojaSilowniaModules?.stateStorage?.key==='moja-silownia-preview-v01');
    await page.evaluate(()=>{startManualWorkout();confirmWorkoutStart();});
    assert.equal(await page.evaluate(()=>localStorage.getItem('moja-silownia-v01')),before,'staging does not touch production state');
    assert.ok(await page.evaluate(()=>localStorage.getItem('moja-silownia-preview-v01')));
    const expectedTitle=fs.readFileSync(path.join(root,'preview/index.html'),'utf8').match(/<title>([^<]+)<\/title>/)[1];
    assert.match(expectedTitle,/TEST v\d+\.\d+\.\d+/);
    assert.equal(await page.title(),expectedTitle);
    assert.deepEqual(errors,[]);
   }finally{await context.close();}
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
};
