// Register the trainer unit suites in the existing Node regression workflow.
import './trainer-preparation.test.cjs';
import './trainer-drafts.test.cjs';
import './progress-blank-regression.test.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('the preparation modules load in order and are all cached',()=>{
 const html=read('index.html'),sw=read('sw.js'),preview=read('preview/index.html'),psw=read('preview/sw.js');
 const scripts=['assistant/assistant-progression.js','assistant/trainer-preparation.js','assistant/trainer-drafts.js','assistant/trainer-workout-ui.js'];
 for(const [page,worker] of [[html,sw],[preview,psw]]){
  let pos=-1;for(const script of scripts){const next=page.indexOf(script);assert.ok(next>pos,script);const versioned=page.slice(next,page.indexOf('"',next));assert.match(versioned,/\?v=\d+$/);assert.ok(worker.includes(versioned),versioned);pos=next;}
 }
 assert.match(read('preview/modules/bootstrap.js'),/key:'moja-silownia-preview-v01'/);
 assert.match(preview,/const key='moja-silownia-preview-v01'/);
 assert.match(psw,/moja-silownia-preview-shell-v48-technique-3\.3\.2/);
 assert.match(html,/const key='moja-silownia-v01'/);
});

test('timed preparation is loaded before the trainer and cached',()=>{const html=read('index.html'),sw=read('sw.js');let last=-1;for(const script of ['modules/timed-exercise-core.js?v=3','assistant/timed-preparation.js?v=1','assistant/trainer-preparation.js?v=311']){const pos=html.indexOf(script);assert.ok(pos>last,script);assert.ok(sw.includes(script));last=pos;}});
