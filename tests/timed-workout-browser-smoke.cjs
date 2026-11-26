'use strict';
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
    for (const width of [360, 390, 1100]) {
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
            targets:[{sets:2,reps:'45–60 s',weight:0},{sets:1,reps:'10',weight:40}]}],
          active:[],sessions:[] };
        await page.addInitScript(seed => {
          if (!localStorage.getItem('moja-silownia-v01'))
            localStorage.setItem('moja-silownia-v01', JSON.stringify(seed));
          localStorage.setItem('moja-silownia-preview-v01','preview-sentinel');
        }, seed);
        await page.goto('http://127.0.0.1:' + server.address().port + '/');
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
        await saveSeconds(second,45);
        assertTimedSet(await page.evaluate(() => state.active[1]),45);
        await openCard(bench);
        await bench.locator('#r_1_0_w').fill('40');
        await bench.locator('#r_1_0_r').fill('10');
        await bench.locator('button[onclick^="togglePlanRow"]').click();
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
        assert.equal(await page.evaluate(() => localStorage.getItem('moja-silownia-preview-v01')),'preview-sentinel');
        assert.deepEqual(errors,[]);
        console.log('Timed workout smoke passed at width ' + width);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
