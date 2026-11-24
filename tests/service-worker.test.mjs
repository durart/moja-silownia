import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../sw.js', import.meta.url), 'utf8');

function setup({ failPrecache = false } = {}) {
  const handlers = new Map();
  const deleted = [];
  const added = [];
  const cache = {
    add: async asset => {
      added.push(asset);
      if (failPrecache && asset.includes('index.html')) throw new Error('offline');
    },
  };
  const caches = {
    open: async () => cache,
    delete: async key => { deleted.push(key); return true; },
    keys: async () => ['moja-silownia-shell-old', 'unrelated-cache'],
  };
  const worker = {
    location: { origin: 'https://example.test' },
    registration: { scope: 'https://example.test/moja-silownia/' },
    addEventListener: (name, handler) => handlers.set(name, handler),
  };
  vm.runInNewContext(source, { self: worker, caches, URL, Promise, Response });
  return { handlers, deleted, added };
}

test('precache failure rejects installation and removes incomplete cache', async () => {
  const { handlers, deleted } = setup({ failPrecache: true });
  let promise;
  handlers.get('install')({ waitUntil: value => { promise = value; } });
  await assert.rejects(promise, /offline/);
  assert.equal(deleted.length, 1);
  assert.match(deleted[0], /^moja-silownia-shell-/);
});

test('successful installation populates assets without immediate takeover', async () => {
  const { handlers, added } = setup();
  let promise;
  handlers.get('install')({ waitUntil: value => { promise = value; } });
  await promise;
  assert.ok(added.length > 30);
  assert.equal(new Set(added).size, added.length);
});

test('activation removes only outdated application caches', async () => {
  const { handlers, deleted } = setup();
  let promise;
  handlers.get('activate')({ waitUntil: value => { promise = value; } });
  await promise;
  assert.deepEqual(deleted, ['moja-silownia-shell-old']);
});

test('production worker never intercepts preview navigation',()=>{const {handlers}=setup();let responded=false;handlers.get('fetch')({request:{method:'GET',url:'https://example.test/moja-silownia/preview/',mode:'navigate'},respondWith(){responded=true;}});assert.equal(responded,false);});
