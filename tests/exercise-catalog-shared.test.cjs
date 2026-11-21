const test=require('node:test'),assert=require('node:assert/strict');const C=require('../exercise-catalog-shared.js');
const exercises=[{id:'a',name:'Dead bug',group:'Kalistenika',equipment:'Masa ciała'},{id:'b',name:'Wyciskanie',group:'Klatka piersiowa'},{id:'c',name:'Bieg',group:'Kardio'}];
test('one ordered list of 12 categories',()=>{assert.equal(C.categories.length,12);assert.equal(new Set(C.categories.map(x=>x.id)).size,12)});
test('original Własne sprite preserved in Kalistenika',()=>{const c=C.categories[9];assert.equal(c.id,'Kalistenika');assert.equal(c.art,9)});
test('no old Własne tile, custom exercises remain available in all',()=>{assert.equal(C.categories.some(x=>x.label==='Własne'),false);assert.equal(C.matches({group:'Inne',equipment:'Własne'},'__all__'),true)});
test('same 12 tile categories in workout and atlas',()=>{const a=C.tiles(exercises,{surface:'picker'}),b=C.tiles(exercises,{surface:'atlas'});assert.equal((a.match(/<button /g)||[]).length,12);assert.equal((b.match(/<button /g)||[]).length,12);assert.match(a,/<strong>Kalistenika<\/strong>/);assert.match(b,/<span>Kalistenika<\/span>/);assert.match(a,/pick-source-9/);assert.match(b,/catalog-source-9/)});
test('correct counts and special category behavior',()=>{assert.equal(C.count(exercises,'Kalistenika'),1);assert.equal(C.count(exercises,'__all__'),3);assert.equal(C.count(exercises,'__cardio__'),1)});
test('escape user-controlled labels in HTML',()=>{const html=C.tiles([{id:'x',group:'Kalistenika',name:'<img>'}],{surface:'picker'});assert.doesNotMatch(html,/<img>/)});
