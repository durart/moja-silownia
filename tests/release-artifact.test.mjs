import test from 'node:test';
import assert from 'node:assert/strict';
import { publicPath, validateReleaseSha } from '../scripts/release-artifact.mjs';
for (const path of ['index.html','preview/index.html','vendor/pdfjs/pdf.min.mjs','assets/a.png']) test('public '+path,()=>assert.equal(publicPath(path),true));
for (const path of ['.github/a','docs/a','tests/a','scripts/a','AGENTS.md','preview/../index.html','preview/.env','/index.html']) test('excluded '+path,()=>assert.equal(publicPath(path),false));
test('exact SHA accepted',()=>validateReleaseSha('a'.repeat(40),'a'.repeat(40)));
test('stale SHA rejected',()=>assert.throws(()=>validateReleaseSha('a'.repeat(40),'b'.repeat(40))));
test('short SHA rejected',()=>assert.throws(()=>validateReleaseSha('abc','abc')));
