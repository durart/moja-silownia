import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function importSource(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  return import('data:text/javascript;charset=utf-8,' + encodeURIComponent(source));
}

const storage = await importSource('../modules/storage.js');
const stateCore = await importSource('../modules/state-core.js');

test('valid JSON backup is accepted without changing input', () => {
  const input = { exercises: [{ id: 'bench', name: 'Bench' }], active: [], sessions: [] };
  const text = storage.serializeBackup(input);
  assert.deepEqual(storage.parseBackup(text), input);
});

test('invalid or truncated JSON backup is rejected', () => {
  assert.throws(() => storage.parseBackup('{'), SyntaxError);
  assert.throws(() => storage.parseBackup(JSON.stringify({ exercises: [], sessions: [] })), /format/);
});

test('unreadable primary state recovers from valid backup', () => {
  const backup = JSON.stringify({ exercises: [], active: [{ exerciseId: 'bench' }], sessions: [] });
  const result = stateCore.selectInitialState('{invalid', backup, []);
  assert.equal(result.source, 'backup');
  assert.equal(result.state.active.length, 1);
  assert.equal(result.unreadable, '{invalid');
});

test('valid primary state takes precedence over backup', () => {
  const primary = JSON.stringify({ exercises: [], active: [], sessions: [{ id: 1 }] });
  const result = stateCore.selectInitialState(primary, null, []);
  assert.equal(result.source, 'primary');
  assert.equal(result.state.sessions.length, 1);
});

test('backup selection does not mutate stored records', () => {
  const raw = JSON.stringify({ exercises: [], active: [], sessions: [{ id: 7 }] });
  const result = stateCore.selectInitialState(raw, '{broken', []);
  assert.equal(result.state.sessions[0].id, 7);
  assert.equal(result.unreadable, null);
});
