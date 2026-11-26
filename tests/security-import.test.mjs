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
    const data = new ArrayBuffer(8);
    await context.impRead({ name: 'plan.pdf', arrayBuffer: async () => data });
    assert.equal(options.isEvalSupported, false);
    assert.equal(options.data, data);
  });
}
