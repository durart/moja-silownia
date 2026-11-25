import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const context={window:{}};
vm.runInNewContext(read('exercise-technique-library.js'),context);
const guides=context.window.EXERCISE_TECHNIQUE_LIBRARY;
assert.equal(Object.keys(guides).length,103);
for(let i=0;i<103;i++){const g=guides['seed-'+i];assert.ok(g?.muscles&&g.tip&&g.steps.length>=3&&g.errors.length>=2);}
assert.match(guides['seed-52'].steps.join(' '),/Stań/);
assert.doesNotMatch(guides['seed-52'].steps.join(' '),/modlitewnik/i);
const html=read('index.html'),sw=read('sw.js');
assert.ok(html.includes('exercise-technique-library.js?v=1'));
assert.ok(sw.includes('exercise-technique-library.js?v=1'));
assert.ok(!html.includes('techniqueLibrary.find'));
for(const id of [11,14,18,30,37,44,47,48,52,56,62,65,74,76,78,81,91,99,100]){const p='assets/exercise-guides/seed-'+id+'.webp';assert.ok(existsSync(new URL('../'+p,import.meta.url)),p);assert.ok(sw.includes('./'+p),p);}
console.log('Technique catalog regression checks passed');
