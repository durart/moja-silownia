const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const atlas=require('../muscle-atlas-core.js');
const fatigue=require('../muscle-fatigue-core.js');
const exercises=[{id:'seed-0',group:'Klatka piersiowa',name:'Bench press'},{id:'seed-3',group:'Plecy',name:'Row'},{id:'custom-1',group:'Łydki',name:'Calf raise'}];
const session={date:'2026-11-23T09:00:00Z',sets:[{exerciseId:'seed-0',weight:60,reps:10,rir:2},{exerciseId:'seed-3',weight:50,reps:12,rir:2}]};
test('all nine muscle identifiers are supported',()=>{
 assert.equal(atlas.MUSCLES.length,9);
 assert.equal(new Set(atlas.MUSCLES).size,9);
 assert.ok(atlas.MUSCLES.includes('Przedramiona'));
});
test('atlas scores match canonical fatigue used by dashboard',()=>{
 const now=Date.parse('2026-11-23T13:00:00Z');
 const model=atlas.buildModel([session],exercises,fatigue,now);
 const original=fatigue.fatigue([session],exercises,now);
 for(const item of model){
  assert.equal(item.score,original[item.name]||0,item.name);
  assert.equal(item.exerciseCount,exercises.filter(ex=>ex.group===item.name).length);
 }
});
test('missing or invalid values do not produce wrong coloring',()=>{
 const fake={fatigue:()=>({'Klatka piersiowa':201,'Plecy':-14,'Barki':NaN})};
 const model=atlas.buildModel(null,null,fake);
 assert.equal(atlas.getMuscle(model,'Klatka piersiowa').score,100);
 assert.equal(atlas.getMuscle(model,'Plecy').score,0);
 assert.equal(atlas.getMuscle(model,'Barki').score,0);
 assert.equal(atlas.getMuscle(model,'nonexistent'),null);
 assert.equal(atlas.buildModel(undefined,undefined,undefined).length,9);
});
test('levels use existing dashboard thresholds',()=>{
 assert.equal(atlas.level(0),'none');
 assert.equal(atlas.level(34),'low');
 assert.equal(atlas.level(35),'medium');
 assert.equal(atlas.level(64),'medium');
 assert.equal(atlas.level(65),'high');
 assert.equal(atlas.label(65),'Wysokie');
});
test('rendering model does not modify training history',()=>{
 const original=JSON.stringify({sessions:[session],exercises});
 const data=JSON.parse(original);
 atlas.buildModel(data.sessions,data.exercises,fatigue);
 assert.equal(JSON.stringify(data),original);
 assert.doesNotMatch(read('muscle-atlas-ui.js'),/localStorage|indexedDB|save\(\)|state\.(sessions|plans|exercises)\s*=/);
});
test('atlas uses approved shared 30-region SVG with accessible controls',()=>{
 const ui=read('muscle-atlas-ui.js');
 const art=require('../muscle-anatomy-art.js');
 assert.equal(art.REGIONS.length,56);
 assert.equal(new Set(art.REGIONS.map(area=>area.muscle)).size,9);
 assert.match(ui,/MuscleAnatomyArt\.renderAtlas/);
 assert.match(ui,/path\.muscle-region\[data-muscle\]/);
 assert.match(ui,/aria-pressed/);
 assert.match(ui,/keydown/);
 assert.match(ui,/selectedMuscle=null/);
 assert.match(ui,/data-ma-reset/);
 assert.match(ui,/data-ma-legend|ma-legend/);
 assert.doesNotMatch(ui,/localStorage|indexedDB|data:image|\.jpe?g/);
 for(const muscle of atlas.MUSCLES)assert.ok(art.REGIONS.some(area=>area.muscle===muscle),muscle);
});
test('production and preview code match with isolated staging cache',()=>{
 for(const name of ['muscle-atlas-core.js','muscle-atlas-ui.js','muscle-atlas.css','muscle-anatomy-art.js']){
  const version=name==='muscle-atlas-core.js'?'1':name==='muscle-atlas.css'?'32':name==='muscle-anatomy-art.js'?'41':'40';
  assert.equal(read(name),read('preview/'+name));
  for(const html of ['index.html','preview/index.html'])assert.ok(read(html).includes('./'+name+'?v='+version),html+' '+name);
  for(const sw of ['sw.js','preview/sw.js'])assert.ok(read(sw).includes('./'+name+'?v='+version),sw+' '+name);
 }
 assert.match(read('preview/index.html'),/moja-silownia-preview-v01/);
 assert.match(read('preview/sw.js'),/moja-silownia-preview-shell-/);
 assert.doesNotMatch(read('preview/sw.js'),/self\.skipWaiting\(\)/);
});
