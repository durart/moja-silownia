const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const art=require('../muscle-anatomy-art.js');
const atlas=require('../muscle-atlas-core.js');

test('approved art contains 30 individually addressable SVG regions in all nine groups',()=>{
 assert.equal(art.REGIONS.length,30);
 assert.equal(new Set(art.REGIONS.map(region=>region.id)).size,30);
 assert.deepEqual(new Set(art.REGIONS.map(region=>region.muscle)),new Set(atlas.MUSCLES));
});
test('both feature surfaces depend on the same anatomical artwork module',()=>{
 assert.match(read('muscle-atlas-ui.js'),/MuscleAnatomyArt\.renderAtlas/);
 for(const html of ['index.html','preview/index.html']){
  const src=read(html);
  assert.match(src,/window\.MuscleAnatomyArt/);
  assert.match(src,/art\.renderSession\(muscleRoles\(s\),width\)/);
  assert.match(src,/art\.drawSession\(ctx,muscleRoles\(s\),x,y,width\)/);
  assert.ok(src.indexOf('muscle-anatomy-art.js?v=31')<src.indexOf('summary-core.js?v=1'));
 }
});
test('PNG export preserves portrait proportions and offers fallback',()=>{
 assert.equal(typeof art.drawSession,'function');
 assert.ok(art.aspectRatio>.70 && art.aspectRatio<.9);
 assert.match(read('index.html'),/let svg=anatomySVG\(s,width\)/);
});
test('all v3 PWA assets are precached in both scopes without touching local storage',()=>{
 for(const path of ['sw.js','preview/sw.js']){
  const src=read(path);
  assert.ok(src.includes('muscle-anatomy-art.js?v=31'));
  assert.ok(src.includes('muscle-atlas-ui.js?v=3'));
  assert.ok(src.includes('muscle-atlas.css?v=3'));
  assert.ok(src.includes('anatomy-v3'));
 }
 assert.equal(read('muscle-anatomy-art.js'),read('preview/muscle-anatomy-art.js'));
 assert.equal(read('muscle-atlas-ui.js'),read('preview/muscle-atlas-ui.js'));
 assert.equal(read('muscle-atlas.css'),read('preview/muscle-atlas.css'));
 for(const name of ['muscle-anatomy-art.js','muscle-atlas-ui.js']){
  assert.doesNotMatch(read(name),/localStorage|indexedDB|sessionStorage|fetch\(/);
 }
});