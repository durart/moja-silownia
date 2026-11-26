import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const root = process.env.SECURITY_VENDOR_ROOT;
test('real PDF and DOCX dependency smoke tests', {skip: !root}, async () => {
  const pdfjs = await import(pathToFileURL(resolve(root, 'node_modules/pdfjs-dist/legacy/build/pdf.mjs')).href);
  const mammoth = (await import(pathToFileURL(resolve(root, 'node_modules/mammoth/lib/index.js')).href)).default;
  const pdf = await readFile(resolve(root, 'fixtures/plan.pdf'));
  const task = pdfjs.getDocument({data:new Uint8Array(pdf),isEvalSupported:false});
  try {
    const doc = await task.promise;
    const page = await doc.getPage(1);
    const text = (await page.getTextContent()).items.map(item=>item.str).join(' ');
    assert.match(text,/TRENING 1/);
  } finally { await task.destroy(); }
  const docx = await readFile(resolve(root,'fixtures/plan.docx'));
  const result = await mammoth.convertToHtml({buffer:docx},{externalFileAccess:false});
  assert.match(result.value,/TRENING 1/);
  assert.match(result.value,/Bench press/);
});
