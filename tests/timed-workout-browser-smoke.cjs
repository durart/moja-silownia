'use strict';
const release=require('./release-surfaces.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

async function openCard(card) {
  await card.locator('.compact-card-toggle').waitFor();
  if (await card.locator('.compact-card-toggle').getAttribute('aria-expanded') !== 'true')
    await card.locator('.compact-card-toggle').click();
}
function timedRow(card, index) {
  return card.locator('.timed-set[data-timed-index="' + index + '"]');
}
async function rejectedWrite(page,key,button){
  await page.evaluate(key=>{
    window.originalWorkoutSetItem=Storage.prototype.setItem;
    Storage.prototype.setItem=function(k,v){if(k===key)throw Error('Injected workout write failure');return window.originalWorkoutSetItem.call(this,k,v);};
  },key);
  const snapshot=()=>page.evaluate(key=>({active:state.active,cardio:state.activeCardio,rest:state.restUntil,raw:localStorage.getItem(key)}),key);
  const before=await snapshot();
  try{await button.click();assert.deepEqual(await snapshot(),before);}
  finally{await page.evaluate(()=>{Storage.prototype.setItem=window.originalWorkoutSetItem;delete window.originalWorkoutSetItem;});}
}
async function saveSeconds(row, seconds) {
  await row.locator('input[id$="_duration"]').fill(String(seconds));
  await row.locator('.timed-save').click();
}
function assertTimedSet(set, seconds) {
  assert.equal(set.measurementType, 'duration');
  assert.equal(set.durationSeconds, seconds);
  assert.equal(Object.hasOwn(set, 'reps'), false);
  assert.equal(Object.hasOwn(set, 'rir'), false);
}

(async () => {
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = path.resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); res.end(); return;
    }
    const types = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript',
      '.css':'text/css', '.json':'application/json', '.webmanifest':'application/manifest+json',
      '.png':'image/png', '.svg':'image/svg+xml', '.webp':'image/webp' };
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless:true, args:['--no-sandbox'] });
  try {
    for (const [width, preview] of [[360,false],[390,false],[1100,false],[390,true]]) {
      const storageKey=preview?'moja-silownia-preview-v01':'moja-silownia-v01';
      const otherKey=preview?'moja-silownia-v01':'moja-silownia-preview-v01';
      const context = await browser.newContext({ viewport:{ width, height:844 } });
      try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('dialog', d => d.accept());
        const seed = { exercises:[{id:'seed-14',name:'Plank',group:'Brzuch',equipment:'Masa ciała'},
          {id:'seed-93',name:'Plank boczny',group:'Brzuch',equipment:'Masa ciała'},
          {id:'bench-test',name:'Wyciskanie testowe',group:'Klatka piersiowa',equipment:'Sztanga'}],
          plans:[{id:17,name:'Plan testowy',exerciseIds:['seed-14','bench-test'],
            targets:[{sets:2,reps:'45–60 s',weight:0},{sets:1,reps:'10',weight:40,rest:'120',notes:'Kontroluj ruch'}]}],
          active:[],sessions:[] };
        await page.addInitScript(({seed,storageKey,otherKey}) => {
          if (!localStorage.getItem(storageKey)) localStorage.setItem(storageKey,JSON.stringify(seed));
          if (!localStorage.getItem(otherKey)) localStorage.setItem(otherKey,'isolation-sentinel');
        }, {seed,storageKey,otherKey});
        await page.goto('http://127.0.0.1:' + server.address().port + (preview?'/preview/':'/'));
        assert.match(await page.title(),preview?release.versionPattern('preview','TEST v'):release.versionPattern('production'));
        await page.waitForFunction(() => !!window.MojaTimedWorkout && !!document.getElementById('compactWorkoutDock'));
        await page.evaluate(() => { startPlan(0); confirmWorkoutStart(); });
        const plank = page.locator('#planWorkout [data-workout-slot="0"]');
        const bench = page.locator('#planWorkout [data-workout-slot="1"]');
        await openCard(plank);
        const first = timedRow(plank,0), second = timedRow(plank,1);
        assert.equal(await first.locator('input[id$="_duration"]').inputValue(),'45');
        assert.equal(await first.locator('.sport-rir, input[id$="_r"]').count(),0);
        assert.equal(await plank.locator('.set-head').count(),0);
        assert.equal(await first.locator('input[id$="_w"]').inputValue(),'0');
        const layout = await first.evaluate(row => ({
          width: row.clientWidth, scroll: row.scrollWidth,
          time: getComputedStyle(row.querySelector('.timed-duration-field')).gridRowStart,
          timer: getComputedStyle(row.querySelector('.timed-stopwatch')).gridRowStart
        }));
        assert.ok(layout.scroll <= layout.width + 2, 'timed row must fit viewport');
        assert.equal(layout.time,'2'); assert.equal(layout.timer,'4');
        await first.locator('button[data-timed-action="start"]').click();
        assert.ok(await second.locator('button[data-timed-action="start"]').isDisabled());
        const startedAt = await page.evaluate(() => state.timedTimer.startedAt);
        await page.waitForTimeout(1100);
        await page.reload();
        await openCard(plank);
        assert.equal(await page.evaluate(() => state.timedTimer.startedAt),startedAt);
        await first.locator('button[data-timed-action="stop"]').click();
        const measured = Number(await first.locator('input[id$="_duration"]').inputValue());
        assert.ok(measured >= 1);
        assert.equal(await page.evaluate(() => state.timedTimer),null);
        await page.reload();
        await openCard(plank);
        assert.equal(Number(await first.locator('input[id$="_duration"]').inputValue()),measured);
        await first.locator('.timed-save').click();
        assertTimedSet(await page.evaluate(() => state.active[0]),measured);
        assert.ok(await page.evaluate(() => state.restUntil > Date.now()));
        await second.locator('input[id$="_duration"]').fill('45');
        await second.locator('input[id$="_duration"]').blur();
        await rejectedWrite(page,storageKey,second.locator('.timed-save'));
        await saveSeconds(second,45);
        assert.equal(await page.evaluate(()=>state.active.length),2);
        assertTimedSet(await page.evaluate(() => state.active[1]),45);
        await openCard(bench);
        await bench.locator('#r_1_0_w').fill('40');
        await bench.locator('#r_1_0_r').fill('10');
        await bench.locator('#r_1_0_r').blur();
        await rejectedWrite(page,storageKey,bench.locator('button[onclick^="togglePlanRow"]'));
        await bench.locator('button[onclick^="togglePlanRow"]').click();
        const restSnapshot=await page.evaluate(()=>({remaining:state.restUntil-Date.now(),global:state.restSettings['bench-test']??null}));
        assert.ok(restSnapshot.remaining>115000 && restSnapshot.remaining<=120000,'planned rest must start a 120 second countdown');
        assert.equal(restSnapshot.global,null,'plan must not overwrite global rest preference');
        assert.match(await bench.textContent(),/Kontroluj ruch/);
        assert.equal(await page.evaluate(()=>state.active.length),3);
        assert.equal(await page.evaluate(() => state.active[2].reps),10);
        assert.equal(await page.evaluate(() => Object.hasOwn(state.active[2],'durationSeconds')),false);
        await page.evaluate(() => addPlanExtraExercise('seed-93'));
        const extra = page.locator('#planWorkout .plan-extra-card[data-exercise-id="seed-93"]');
        await openCard(extra);
        await saveSeconds(timedRow(extra,0),30);
        assertTimedSet(await page.evaluate(() => state.active.find(x=>x.exerciseId==='seed-93')),30);
        await page.evaluate(() => finishWorkout());
        assert.equal(await page.evaluate(() => state.sessions[0].sets.length),4);
        assertTimedSet(await page.evaluate(() => state.sessions[0].sets[0]),measured);
        assert.equal(await page.evaluate(() => state.timedTimer),undefined);
        assert.ok(await page.evaluate(()=>state.sessions[0].fatigueImpulse.Brzuch>0));
        assert.equal(await page.evaluate(()=>state.sessions[0].fatigueModel),3);
        assert.match(await page.locator('#summaryContent').textContent(),/CZAS IZOMETRII/);
        assert.match(await page.locator('#summaryContent').textContent(),/45 s/);
        assert.doesNotMatch(await page.locator('#summaryContent').textContent(),/NaN|undefined/);
        await page.evaluate(()=>{tab('history');renderHistory();});
        assert.match(await page.locator('#historyList').textContent(),/400 kg objętości/);
        assert.match(await page.locator('#historyList').textContent(),/s izometrii/);
        await page.evaluate(()=>{tab('progress');progressSelect('seed-14');});
        assert.match(await page.locator('#progressContent').textContent(),/Progresja czasowa/);
        assert.equal(await page.locator('#progressContent select option[value="bestSeconds"]').count(),1);
        assert.equal(await page.locator('#progressContent select option[value="oneRM"]').count(),0);
        await page.evaluate(()=>{progressMetric('totalSeconds');progressView('reports');});
        assert.match(await page.locator('#progressContent').textContent(),/Czas izometrii/);
        await page.evaluate(()=>progressView('exercise'));
        await page.evaluate(() => { tab('workout'); startPlan(0); confirmWorkoutStart(); });
        await openCard(plank);
        assert.equal(await first.locator('input[id$="_duration"]').inputValue(),'45');
        await saveSeconds(first,45); await saveSeconds(second,45);
        assert.equal(await page.evaluate(()=>state.active[0].targetSetCount),2);
        await page.evaluate(()=>finishWorkout());
        await page.evaluate(()=>{tab('workout');startPlan(0);confirmWorkoutStart();});
        await openCard(plank);
        assert.equal(await first.locator('input[id$="_duration"]').inputValue(),'50');
        assert.match(await plank.locator('.advisor-progression').textContent(),/Możliwa progresja czasu/);
        assert.doesNotMatch(await plank.locator('.advisor-progression').textContent(),/Cel RIR|RIR wpisz|progresja ciężaru/);
        await page.evaluate(()=>changeSessionRecoveryMode(true));
        await openCard(plank);
        assert.equal(await first.locator('input[id$="_duration"]').inputValue(),'45');
        await page.evaluate(()=>changeSessionRecoveryMode(false));
        await openCard(plank);
        assert.equal(await first.locator('input[id$="_duration"]').inputValue(),'50');
        await page.evaluate(()=>finishWorkout());
        await page.evaluate(() => { tab('workout'); startManualWorkout(); confirmWorkoutStart();
          document.getElementById('exercise').value='seed-14'; addManualExercise(); });
        const manual = page.locator('#today [data-exercise-id="seed-14"]');
        await openCard(manual);
        const manualRow = timedRow(manual,0);
        await saveSeconds(manualRow,40);
        assertTimedSet(await page.evaluate(() => state.active[0]),40);
        await openCard(manual);
        await manualRow.locator('.timed-save').click();
        assert.equal(await page.evaluate(() => state.active.length),0);
        assert.equal(await manualRow.locator('input[id$="_duration"]').inputValue(),'40');
        await saveSeconds(manualRow,42);
        assertTimedSet(await page.evaluate(() => state.active[0]),42);
        await page.evaluate(async () => { await navigator.serviceWorker.ready; });
        await page.reload();
        await page.waitForFunction(() => !!navigator.serviceWorker.controller);
        await context.setOffline(true);
        await page.reload({ waitUntil:'domcontentloaded' });
        await openCard(manual);
        assertTimedSet(await page.evaluate(() => state.active[0]),42);
        assert.equal(await page.evaluate(key => localStorage.getItem(key),otherKey),'isolation-sentinel');
        const expectedCache=fs.readFileSync(path.join(root,preview?'preview/sw.js':'sw.js'),'utf8').match(/const CACHE='([^']+)'/)[1];
        assert.ok(expectedCache.startsWith(preview?'moja-silownia-preview-shell-':'moja-silownia-shell-'));
        assert.ok((await page.evaluate(()=>caches.keys())).includes(expectedCache));;
        if(await page.evaluate(()=>!!window.MojaCardioWorkout)){
          // Continue the existing manual workout while offline, with cardio and a saved timed set.
          await page.evaluate(()=>{document.getElementById('exercise').value='cardio-treadmill-walk';addManualExercise();});
          const cardio=page.locator('#today [data-cardio-id="cardio-treadmill-walk"]');
          await openCard(cardio);
          await cardio.locator('input[data-cardio-field="speedKmh"]').fill('5.5');
          await cardio.locator('input[data-cardio-field="inclinePercent"]').fill('5');
          await cardio.locator('button[data-cardio-action="start"]').click();
          await page.waitForTimeout(1100);
          await cardio.locator('button[data-cardio-action="pause"]').click();
          const timerSnapshot=await page.evaluate(()=>state.cardioTimer);
          assert.equal(timerSnapshot.status,'paused');
          await page.reload({waitUntil:'domcontentloaded'});
          await openCard(cardio);
          assert.deepEqual(await page.evaluate(()=>state.cardioTimer),timerSnapshot);
          await cardio.locator('button[data-cardio-action="resume"]').click();
          await page.waitForTimeout(1100);
          await cardio.locator('button[data-cardio-action="stop"]').click();
          await cardio.locator('input[data-cardio-field="durationSeconds"]').fill('30');
          await cardio.locator('input[data-cardio-field="durationSeconds"]').blur();
          await rejectedWrite(page,storageKey,cardio.locator('button[data-cardio-action="save"]'));
          await cardio.locator('button[data-cardio-action="save"]').click();
          assert.equal(await page.evaluate(()=>state.activeCardio.length),1);
          const persisted=await page.evaluate(()=>({active:state.active,cardio:state.activeCardio,startedAt:state.startedAt}));
          const reopenUrl=page.url();
          const reopened=await context.newPage();
          await reopened.goto(reopenUrl,{waitUntil:'domcontentloaded'});
          await reopened.waitForFunction(()=>!!window.MojaCardioWorkout);
          assert.deepEqual(await reopened.evaluate(()=>({active:state.active,cardio:state.activeCardio,startedAt:state.startedAt})),persisted);
          await reopened.close();
          const closed=await context.newPage();await closed.goto(reopenUrl,{waitUntil:'domcontentloaded'});await closed.close();
          const resumed=await context.newPage();await resumed.goto(reopenUrl,{waitUntil:'domcontentloaded'});await resumed.waitForFunction(()=>!!window.MojaCardioWorkout);assert.deepEqual(await resumed.evaluate(()=>({active:state.active,cardio:state.activeCardio,startedAt:state.startedAt})),persisted);await resumed.close();
          console.log('Offline reopen and rejected strength, timed and cardio writes PASS');
          assert.equal(await page.evaluate(()=>state.active.length),1);
          assert.equal(await page.evaluate(()=>state.activeCardio[0].durationSeconds),1800);
          assert.match(await cardio.locator('.compact-card-status').innerText(),/Kardio wykonane/);
          await page.evaluate(()=>finishWorkout());
          const mixed=await page.evaluate(()=>state.sessions[0]);
          assert.equal(mixed.sets.length,1);
          assert.equal(mixed.cardio.length,1);
          assert.equal(mixed.cardio[0].distanceMeters,2750);
          assert.ok(mixed.calories.cardio.active>0);
          assert.match(await page.locator('#summaryContent').textContent(),/CZAS KARDIO/);
          assert.equal(await page.evaluate(key=>localStorage.getItem(key),otherKey),'isolation-sentinel');
        }
        assert.deepEqual(errors,[]);
        console.log('Timed workout smoke passed at width '+width+' ('+(preview?'preview':'candidate')+')');
      } finally { await context.close(); }
    }
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
