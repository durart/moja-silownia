import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

for (const prefix of ['', 'preview/']) {
  test(prefix + 'PDF import disables dynamic evaluation', async () => {
    const source = await readFile(new URL('../' + prefix + 'plan-importer.js', import.meta.url), 'utf8');
    let options;
    const pdfjsLib = { GlobalWorkerOptions: {}, getDocument(value) {
      options = value;
      return { promise: Promise.resolve({ numPages: 0 }) };
    }};
    const context = vm.createContext({ window: { pdfjsLib } });
    vm.runInContext(source, context);
    context.impLoadPdfLibrary = async () => pdfjsLib;
    const data = new ArrayBuffer(8);
    await context.impRead({ name: 'plan.pdf', arrayBuffer: async () => data });
    assert.equal(options.isEvalSupported, false);
    assert.equal(options.enableScripting, false);
    assert.match(pdfjsLib.GlobalWorkerOptions.workerSrc, /6\.5\.438\/legacy\/build\/pdf\.worker\.min\.mjs$/);
    assert.equal(options.data, data);
  });
}

for (const prefix of ['', 'preview/']) {
  test(prefix + 'oversize document is rejected before reading', async () => {
    const source = await readFile(new URL('../' + prefix + 'plan-importer.js', import.meta.url), 'utf8');
    const context = vm.createContext({});
    vm.runInContext(source, context);
    await assert.rejects(context.impRead({ name: 'plan.pdf', size: 11 * 1024 * 1024 }), /rozmiar/);
    await assert.rejects(context.impRead({ name: 'plan.txt', size: 2 * 1024 * 1024 }), /rozmiar/);
  });
  test(prefix + 'exercise identifiers are not interpolated in event code', async () => {
    const source = await readFile(new URL('../' + prefix + 'index.html', import.meta.url), 'utf8');
    const handlers = source.match(/(?:onclick|onchange|oninput)="[^"]*"/g) || [];
    assert.ok(handlers.length > 0);
    assert.equal(handlers.some(handler => handler.includes('${safe(id)}') || handler.includes('${safe(e.id)}')), false);
  });
}

for (const prefix of ['', 'preview/']) {
  test(prefix + 'plan count and exercise count limits', async () => {
    const source = await readFile(new URL('../' + prefix + 'plan-importer.js', import.meta.url), 'utf8');
    const context = vm.createContext({});
    vm.runInContext(source, context);
    assert.throws(() => context.impValidatePlans(Array.from({length:51}, () => ({rows:[]}))), /limit/);
    assert.throws(() => context.impValidatePlans([{rows:Array(101).fill({})}]), /limit/);
    const valid = [{rows:Array(100).fill({})}];
    assert.equal(context.impValidatePlans(valid), valid);
    assert.throws(() => context.impParse('x'.repeat(1048577), 'plan.txt'), /rozmiar/);
  });
}
