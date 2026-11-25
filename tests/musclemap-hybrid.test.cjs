const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const art=require('../muscle-anatomy-art.js');
const assets=require('../musclemap-hybrid-assets.js');
const atlas=require('../muscle-atlas-core.js');

test('MuscleMap upstream images and traced masks stay in one coordinate system',()=>{
 assert.equal(assets.viewBox,'0 0 1024 1536');
 assert.deepEqual(assets.diagrams.front.muscles.length,26);
 assert.deepEqual(assets.diagrams.back.muscles.length,30);
 for(const side of ['front','back']){
  assert.match(assets.photos[side],/^data:image\/webp;base64,UklGR/);
  assert.ok(assets.diagrams[side].outline.length>10000);
  for(const muscle of assets.diagrams[side].muscles)assert.match(muscle.d,/^M/);
 }
 assert.equal(art.REGIONS.length,56);
 assert.equal(new Set(art.REGIONS.map(part=>part.id)).size,56);
 assert.deepEqual(new Set(art.REGIONS.map(x=>x.muscle)),new Set(atlas.MUSCLES));
});
test('atlas renders overview and single selected muscle for 56 pretraced regions',()=>{
 const model=atlas.MUSCLES.map(name=>({name,score:name==='Nogi'?70:18,label:'Niskie',exerciseCount:1}));
 const overview=art.renderAtlas(model);
 assert.match(overview,/viewBox="0 0 2136 1615"/);
 assert.match(overview,/data-mode="atlas" data-view="overview"/);
 assert.equal((overview.match(/class="mm-photo"/g)||[]).length,2);
 assert.equal((overview.match(/class="mm-muscle muscle-region"/g)||[]).length,56);
 const regionTags=[...overview.matchAll(/<path id="[^"]+" class="mm-muscle muscle-region"[^>]+>/g)].map(match=>match[0]);
 assert.equal(regionTags.filter(tag=>tag.includes('data-selected="true"')).length,0);
 assert.match(overview,/data-level="high"/);
 const focus=art.renderAtlas(model,'Barki');
 assert.match(focus,/data-mode="atlas" data-view="focused"/);
 const active=[...focus.matchAll(/<path id="[^"]+" class="mm-muscle muscle-region"[^>]+>/g)]
  .map(match=>match[0]).filter(tag=>tag.includes('data-selected="true"'));
 assert.ok(active.length>2);
 assert.ok(active.every(tag=>tag.includes('data-muscle="Barki"')));
 assert.ok(focus.includes('stroke:#eaffff'));
});
test('summary uses the same MuscleMap art with separate primary and secondary groups',()=>{
 const summary=art.renderSession({'Klatka piersiowa':1,'Barki':0.5},640);
 assert.match(summary,/data-mode="summary"/);
 assert.match(summary,/data-summary="main"/);
 assert.match(summary,/data-summary="secondary"/);
 assert.equal((summary.match(/class="mm-photo"/g)||[]).length,2);
 assert.ok(!summary.includes('https://raw.githubusercontent.com'));
});
test('PNG renderer embeds images rather than relying on cross-origin images',async()=>{
 const OriginalImage=global.Image;
 let svgData='';
 global.Image=class {
  set src(value){svgData=value;queueMicrotask(()=>this.onload());}
 };
 try {
  const calls=[];
  await art.drawSession({drawImage:(...args)=>calls.push(args)},{'Nogi':1},20,30,400);
  assert.equal(calls.length,1);
  assert.equal(calls[0][1],20);
  assert.equal(calls[0][2],30);
  assert.equal(calls[0][3],400);
  assert.equal(calls[0][4],400*art.aspectRatio);
  assert.match(decodeURIComponent(svgData),/data:image\/webp;base64,/);
 } finally{global.Image=OriginalImage;}
});
test('staging mirrors feature assets without changing training storage',()=>{
 for(const asset of ['musclemap-hybrid-assets.js','muscle-anatomy-art.js','muscle-atlas-ui.js']){
  assert.equal(read(asset),read('preview/'+asset),asset);
  const v=asset==='musclemap-hybrid-assets.js'?'1':'40';
  for(const index of ['index.html','preview/index.html'])assert.ok(read(index).includes('./'+asset+'?v='+v),asset+' '+index);
  for(const sw of ['sw.js','preview/sw.js'])assert.ok(read(sw).includes('./'+asset+'?v='+v),asset+' '+sw);
 }
 assert.match(read('sw.js'),/moja-silownia-shell-v48-technique-3\.3\.1/);
 assert.match(read('preview/sw.js'),/moja-silownia-preview-shell-v48-technique-3\.3\.1/);
 assert.match(read('index.html'),/<title>Moja Siłownia v3\.3\.1/);
 assert.match(read('preview/index.html'),/<title>Moja Siłownia TEST v3\.3\.1/);
 assert.match(read('preview/index.html'),/moja-silownia-preview-v01/);
 assert.doesNotMatch(read('muscle-atlas-ui.js'),/localStorage|indexedDB|sessionStorage/);
 assert.doesNotMatch(read('muscle-anatomy-art.js'),/localStorage|indexedDB|sessionStorage|fetch\(/);
 assert.equal(read('musclemap-license.txt'),read('preview/musclemap-license.txt'));
 assert.match(read('musclemap-license.txt'),/MIT License/);
});
test('two views do not move nested SVG masks out of their source geometry',()=>{
 const ui=read('muscle-atlas-ui.js');
 assert.doesNotMatch(ui,/svg\.insertBefore\(path,caption\)/);
 assert.match(ui,/data-ma-reset/);
 assert.match(ui,/selectedMuscle=null/);
});
