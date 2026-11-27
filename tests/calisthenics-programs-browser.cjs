'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+(u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [360,1100]){
   const context=await browser.newContext({viewport:{width,height:844}});
   try{
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
    await page.addInitScript(()=>localStorage.setItem('moja-silownia-v01','production-sentinel'));
    const url='http://127.0.0.1:'+server.address().port+'/preview/';
    await page.goto(url);await page.waitForFunction(()=>!!window.MojaPrograms);
    const show=()=>page.evaluate(()=>{tab('plans');showPlansPanel('programs');});
    await show();
    const host=page.locator('#programsContent');
    await host.getByText('Kalistenika — 56 dni',{exact:true}).waitFor();
    assert.equal(await host.locator('.program-week').count(),8);
    await host.getByRole('button',{name:'Rozpocznij dzień'}).click();
    assert.equal(await page.evaluate(()=>state.programTraining.active.run.position),0);
    await host.getByText('Wszystkie ćwiczenia i wyniki',{exact:true}).waitFor();
    assert.equal(await host.locator('.program-overview-row').count(),15);
    // Verify ordinary workout entry points cannot conflict.
    await page.evaluate(()=>startManualWorkout());
    assert.equal(await page.evaluate(()=>!!state.pendingWorkout),false);
    await show();
    async function reps(n){
     await host.locator('input').fill(String(n));
     await host.getByRole('button',{name:'✓ Zatwierdź powtórzenia'}).click();
    }
    await reps(9);await reps(10);await reps(12);await reps(8);
    assert.equal(await page.evaluate(()=>state.programTraining.active.run.records[0].actual),9);
    await host.getByRole('button',{name:'START',exact:true}).click();
    await host.getByRole('button',{name:'Pauza',exact:true}).click();
    assert.equal(await page.evaluate(()=>state.programTraining.active.run.status),'paused');
    await page.reload();await page.waitForFunction(()=>!!window.MojaPrograms);await show();
    await host.getByRole('button',{name:'Wznów',exact:true}).click();
    await page.evaluate(()=>{const original=Date.now.bind(Date);Date.now=()=>original()+26000;});
    await host.getByText('Przerwa między rundami',{exact:true}).waitFor({timeout:8000});
    assert.equal(await page.evaluate(()=>state.programTraining.active.run.records.at(-1).actual),25);
    await host.getByRole('button',{name:'Pomiń przerwę'}).click();
    await reps(12);await reps(10);await reps(12);await reps(8);
    await host.getByRole('button',{name:'Zapisz czas ręcznie'}).click();
    await host.getByRole('button',{name:'Pomiń przerwę'}).click();
    await reps(12);await reps(10);await reps(12);await reps(8);
    await host.getByRole('button',{name:'Zapisz czas ręcznie'}).click();
    await page.locator('#summaryContent .sp2-title').waitFor();
    assert.match(await page.locator('#summaryContent .sp2-title').innerText(),/Dzień 1/);
    assert.equal(await page.locator('#summaryContent .sp2-exercise').count(),5);
    assert.equal(await page.evaluate(()=>state.programTraining.progress['military-calisthenics-56'].completed[0].records.length),15);
    assert.equal(await page.evaluate(()=>state.programTraining.active),null);
    assert.equal(await page.evaluate(()=>localStorage.getItem('moja-silownia-v01')),'production-sentinel');
    assert.equal(await page.evaluate(()=>state.sessions.length),1);
    assert.equal(await page.evaluate(()=>state.sessions[0].sets.length),15);
    await page.locator('#summaryContent [data-sp2="history"]').click();
    await page.locator('#historyList').getByText(/Kalistenika — 56 dni · Dzień 1/).waitFor();
    await show();
    await host.locator('.program-day-detail summary').filter({hasText:'Dzień 1 — Podstawy'}).click();
    await host.getByRole('button',{name:'Pokaż podsumowanie treningu'}).click();
    await page.locator('#summaryContent [data-sp2="program"]').click();
    await page.reload();await page.waitForFunction(()=>!!window.MojaPrograms);await show();
    await host.getByText('Dzień 2 — Górna część ciała',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>state.sessions.length),1);
    // Reconstruct alpha.2 data with completed day but no diary session; retain the raw program results.
    await page.evaluate(()=>{const d=state.programTraining.progress['military-calisthenics-56'].completed[0];delete d.historyId;delete d.startedAt;delete d.bodyWeightKg;state.sessions=[];save();});
    await page.reload();await page.waitForFunction(()=>!!window.MojaPrograms);await show();
    assert.equal(await page.evaluate(()=>state.sessions.length),1);
    assert.equal(await page.evaluate(()=>state.sessions[0].durationSeconds),null);
    assert.equal(await page.evaluate(()=>state.sessions[0].sets.length),15);
    await page.reload();await page.waitForFunction(()=>!!window.MojaPrograms);await show();
    assert.equal(await page.evaluate(()=>state.sessions.length),1);
    assert.deepEqual(errors,[]);
   }finally{await context.close();}
  }
  console.log('Program browser smoke: 360px and 1100px passed');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
