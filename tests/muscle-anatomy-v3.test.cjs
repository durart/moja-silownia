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
  assert.ok(src.indexOf('muscle-anatomy-art.js?v=32')<src.indexOf('summary-core.js?v=1'));
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
  assert.ok(src.includes('muscle-anatomy-art.js?v=32'));
  assert.ok(src.includes('muscle-atlas-ui.js?v=32'));
  assert.ok(src.includes('muscle-atlas.css?v=32'));
  assert.ok(src.includes('anatomy-v32'));
 }
 assert.equal(read('muscle-anatomy-art.js'),read('preview/muscle-anatomy-art.js'));
 assert.equal(read('muscle-atlas-ui.js'),read('preview/muscle-atlas-ui.js'));
 assert.equal(read('muscle-atlas.css'),read('preview/muscle-atlas.css'));
 for(const name of ['muscle-anatomy-art.js','muscle-atlas-ui.js']){
  assert.doesNotMatch(read(name),/localStorage|indexedDB|sessionStorage|fetch\(/);
 }
});
test('v3.2 separates neutral overview colors from focused selection',()=>{
 const ui=read('muscle-atlas-ui.js');
 const artSource=read('muscle-anatomy-art.js');
 const css=read('muscle-atlas.css');
 assert.match(ui,/let selectedMuscle=null/);
 assert.match(ui,/function showAll\(\)/);
 assert.match(ui,/selectedMuscle=null;\s*updateSelection\(\)/);
 assert.match(ui,/data-ma-reset/);
 assert.match(ui,/data-ma-overview/);
 assert.match(ui,/ma-legend/);
 assert.match(ui,/data-view',focused\?'focused':'overview'/);
 assert.match(ui,/data-selected',String\(pressed\)/);
 assert.match(artSource,/renderAtlas\(model,selected=null\)/);
 assert.match(artSource,/data-view',focused\?'focused':'overview'/);
 assert.match(artSource,/data-selected="false"/);
 assert.match(artSource,/data-selected="true"/);
 assert.match(artSource,/fill:transparent;fill-opacity:0;stroke:transparent;stroke-opacity:0/);
 assert.match(artSource,/data-view="focused"/);
 assert.match(artSource,/data-view="overview"/);
 assert.match(css,/\.ma-detail\[hidden\]/);
 assert.match(css,/display:none/);
 assert.doesNotMatch(ui,/localStorage|indexedDB|sessionStorage/);
});
test('approved shared SVG preserves one coordinate system and corrected arm contours',()=>{
 const code=read('muscle-anatomy-art.js');
 const raw=code.match(/const BASE_SVG=("(?:\\.|[^"\\])*");/);
 assert.ok(raw,'embedded SVG source');
 const svg=JSON.parse(raw[1]);
 assert.match(svg,/viewBox="0 0 1448 1086"/);
 const areas=[...svg.matchAll(/<path[^>]*class="muscle-region"[^>]*id="([^"]+)"[^>]*d="([^"]+)"/g)];
 assert.equal(areas.length,30);
 assert.equal(new Set(areas.map(m=>m[1])).size,30);
 for(const [,id,d] of areas){
  assert.ok(d.startsWith('M')&&d.endsWith('Z'),id);
  assert.doesNotMatch(d,/NaN|Infinity|transform=/,id);
 }
 assert.equal(areas.find(m=>m[1]==='biceps-front-left')[2], 'M277 274 Q291 280 292 299 Q289 326 273 346 Q263 355 253 346 Q251 327 260 299Z');
 assert.match(code,/const caption=svg.querySelector\('\.anatomy-caption'\)/);
 assert.match(code,/svg.insertBefore\(path,caption\)/);
 assert.match(code,/function renderSession\(roles,width=700\)/);
 assert.match(code,/async function drawSession\(ctx,roles,x,y,width\)/);
});
