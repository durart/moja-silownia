import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const coreSource = readFileSync(new URL('../summary-core.js', import.meta.url), 'utf8');
const exportSource = readFileSync(new URL('../summary-export.js', import.meta.url), 'utf8');
const uiSource = readFileSync(new URL('../summary-ui.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../summary.css', import.meta.url), 'utf8');

function setupCore() {
  const ctx = { window: {}, console };
  vm.createContext(ctx);
  vm.runInContext(coreSource, ctx);
  return ctx.window.SportSummaryCore;
}
const core = setupCore();
const set = (exerciseId, weight, reps, extra = {}) =>
  ({ exerciseId, name: exerciseId, weight, reps, ...extra });
const training = (sets, extra = {}) => ({
  id: 1700001, date: '2026-11-21T14:00:00.000Z',
  planName: 'Trening A', durationSeconds: 3600,
  sets, calories: { active: 210, total: 310, met: 3.3 }, ...extra
});

test('summary does not modify the completed session or its sets', () => {
  const s = training([set('A', 70, 12), set('B', 55, 10, { rir: 2 })]);
  const before = JSON.stringify(s);
  const model = core.build(s);
  assert.equal(model.exerciseCount, 2);
  assert.equal(model.volume, 1390);
  assert.equal(model.reps, 22);
  assert.equal(model.setCount, 2);
  assert.equal(JSON.stringify(s), before);
});

test('starting at exercise 2 and returning to exercise 1 keeps independent groups', () => {
  const s = training([
    set('B', 55, 12, { planSlotIndex: 1, planSetIndex: 0 }),
    set('A', 70, 12, { planSlotIndex: 0, planSetIndex: 0 }),
    set('B', 57, 12, { planSlotIndex: 1, planSetIndex: 1 })
  ]);
  const m = core.build(s);
  assert.equal(m.exerciseCount, 2);
  assert.deepEqual(Array.from(m.groups,g => g.name), ['B', 'A']);
  assert.equal(m.groups[0].count, 2);
  assert.equal(m.groups[1].count, 1);
});

test('identical exercise repeated at different positions is not merged', () => {
  const m = core.build(training([
    set('A', 60, 10, { planSlotIndex: 0 }),
    set('A', 80, 8, { planSlotIndex: 2 })
  ]));
  assert.equal(m.exerciseCount, 2);
  assert.deepEqual(Array.from(m.groups,g => g.slot), [0, 2]);
});

test('old sessions without plan indexes still render', () => {
  const m = core.build(training([set('seed-1', 60, 10), set('seed-1', 65, 8)]));
  assert.equal(m.exerciseCount, 1);
  assert.equal(m.groups[0].count, 2);
  assert.equal(m.volume, 1120);
});

test('records count completed sets marked with PR; does not invent new PRs', () => {
  const m = core.build(training([
    set('A', 70, 12, { pr: ['Ciężar', 'Objętość'] }),
    set('A', 70, 12, { pr: [] }),
    set('B', 55, 10)
  ]));
  assert.equal(m.prCount, 1);
  assert.equal(m.groups[0].records, 1);
});

test('0 kg exercise counts reps but does not create artificial volume', () => {
  const m = core.build(training([set('Pompki', 0, 18), set('A', 45, 10)]));
  assert.equal(m.volume, 450);
  assert.equal(m.reps, 28);
});

test('invalid or missing values are handled safely', () => {
  assert.equal(core.build(null), null);
  const s = training([set('A', 'bad', null)], {
    date: 'not-a-date', calories: null, durationSeconds: null
  });
  const m = core.build(s);
  assert.equal(m.volume, 0);
  assert.equal(m.date, 'Data nieznana');
  assert.equal(m.activeKcal, null);
});

test('calories prefer persisted estimate over current function', () => {
  let recomputed = false;
  const s = training([set('A', 50, 10)]);
  const m = core.build(s, {
    estimateCalories() { recomputed = true; return { active: 999 }; }
  });
  assert.equal(m.activeKcal, 210);
  assert.equal(recomputed, false);
});

test('new summary assets are integrated and old full PNG remains available', () => {
  assert.match(html, /id="summary"/);
  assert.match(html, /summary-core\.js\?v=2/);
  assert.match(html, /summary-export\.js\?v=2/);
  assert.match(html, /summary-ui\.js\?v=2/);
  assert.match(html, /summary\.css\?v=1/);
  assert.match(html, /openSportSummary\(session\.id\)/);
  assert.match(html, /function exportWorkoutPNG\(id\)/);
  assert.match(html, /openSportSummaryByIndex/);
  assert.match(html, /typeof window\.openSportSummary/);
});

test('inline and external application code parse', () => {
  const inline = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inline);
  assert.doesNotThrow(() => new Function(inline));
  assert.doesNotThrow(() => new Function(coreSource));
  assert.doesNotThrow(() => new Function(exportSource));
  assert.doesNotThrow(() => new Function(uiSource));
});

test('scoped CSS supports mobile and accessibility', () => {
  assert.match(css, /\.sp2-metrics/);
  assert.match(css, /@media \(min-width:680px\)/);
  assert.match(css, /:focus-visible/);
  assert.equal(css.split('{').length, css.split('}').length);
});

test('PNG card keeps fixed 1080x1920 dimensions for long workouts', async () => {
  const textCalls = [];
  const ctx = {
    textBaseline: '', fillStyle: '', font: '',
    fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
    quadraticCurveTo() {}, closePath() {}, fill() {},
    fillText(t) { textCalls.push(String(t)); },
    measureText(t) { return { width: String(t).length * 20 }; }
  };
  let canvas;
  const scope = { window: {}, console,
    document: { createElement(tag) {
      assert.equal(tag, 'canvas');
      canvas = { width: 0, height: 0, getContext: () => ctx };
      return canvas;
    } }
  };
  vm.createContext(scope);
  vm.runInContext(exportSource, scope);
  const many = Array.from({ length: 20 }, (_, i) =>
    set('exercise-' + i, 40 + i, 10));
  const s = training(many);
  const result = await scope.window.SportSummaryExport.draw(s, core.build(s));
  assert.equal(result.width, 1080);
  assert.equal(result.height, 1920);
  assert.ok(textCalls.some(t => t.includes('pozostałych ćwiczeń')));
  assert.ok(textCalls.some(t => t.includes('ZAANGAŻOWANE MIĘŚNIE')));
});

test('PNG card remains usable when anatomy graphic rendering fails', async () => {
  const ctx = {
    fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
    quadraticCurveTo() {}, closePath() {}, fill() {},
    fillText() {}, measureText() { return { width: 1 }; }
  };
  const scope = {
    window: {}, console,
    document: { createElement: () => ({
      width: 0, height: 0, getContext: () => ctx
    }) }
  };
  vm.createContext(scope);
  vm.runInContext(exportSource, scope);
  const s = training([set('A', 70, 10)]);
  await assert.doesNotReject(() =>
    scope.window.SportSummaryExport.draw(s, core.build(s), {
      drawAnatomy: async () => { throw Error('Image decode'); }
    }));
});
