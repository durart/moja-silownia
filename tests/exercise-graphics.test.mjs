import test from 'node:test';
import assert from 'node:assert/strict';
import {exerciseIds,exerciseGraphics,categoryGraphics,exerciseGraphic,categoryGraphic} from '../modules/exercise-graphics.mjs';
test('125 unique exercise assets and 15 category assets',()=>{assert.equal(exerciseIds.length,125);assert.equal(new Set(exerciseIds).size,125);assert.equal(Object.keys(categoryGraphics).length,15);assert.equal(new Set([...Object.values(exerciseGraphics),...Object.values(categoryGraphics)]).size,140);});
test('all six legacy aliases share canonical graphics',()=>{for(const [a,b] of Object.entries({'cali-02':'seed-13','cali-09':'seed-26','cali-10':'seed-27','cali-11':'seed-67','cali-18':'seed-91','cali-19':'seed-89'}))assert.equal(exerciseGraphic(a),exerciseGraphic(b));});
test('unknown IDs safely return null',()=>{for(const id of ['constructor','__proto__','../test','custom-1',null]){assert.equal(exerciseGraphic(id),null);assert.equal(categoryGraphic(id),null);}});
test('category keys match catalog IDs',()=>{assert.equal(categoryGraphic('Klatka piersiowa'),'./assets/graphics-r6/category-01.webp');assert.equal(categoryGraphic('__cardio__'),'./assets/graphics-r6/category-12.webp');});

import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
test('physical assets match approved R6 Git tree',()=>{
 const dir=new URL('../assets/graphics-r6/',import.meta.url);
 const names=readdirSync(dir).sort();
 assert.deepEqual(names,[...Object.values(exerciseGraphics),...Object.values(categoryGraphics)].map(p=>p.split('/').pop()).sort());
 const entries=names.map(name=>{
  const bytes=readFileSync(new URL(name,dir));
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  const sha=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest();
  return Buffer.concat([Buffer.from('100644 '+name+'\0'),sha]);
 });
 const tree=Buffer.concat(entries);
 assert.equal(createHash('sha1').update('tree '+tree.length+'\0').update(tree).digest('hex'),'ce20f931c209ff89ab5a6a4da57c9c1b7f3e81cc');
});
test('inline application scripts parse and all R6 assets are precached',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)){
  if(match[1].trim()&&!/type=["'](?:module|application\/json)["']/.test(match[0].split('>')[0]))new vm.Script(match[1]);
 }
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 new vm.Script(sw);
 for(const path of [...Object.values(exerciseGraphics),...Object.values(categoryGraphics)])assert.ok(sw.includes(JSON.stringify(path)),path);
});
