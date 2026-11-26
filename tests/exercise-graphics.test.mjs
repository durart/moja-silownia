import test from 'node:test';
import assert from 'node:assert/strict';
import {exerciseIds,exerciseGraphics,categoryGraphics,exerciseGraphic,categoryGraphic} from '../modules/exercise-graphics.mjs';
test('125 unique exercise assets and 15 category assets',()=>{assert.equal(exerciseIds.length,125);assert.equal(new Set(exerciseIds).size,125);assert.equal(Object.keys(categoryGraphics).length,15);assert.equal(new Set([...Object.values(exerciseGraphics),...Object.values(categoryGraphics)]).size,140);});
test('all six legacy aliases share canonical graphics',()=>{for(const [a,b] of Object.entries({'cali-02':'seed-13','cali-09':'seed-26','cali-10':'seed-27','cali-11':'seed-67','cali-18':'seed-91','cali-19':'seed-89'}))assert.equal(exerciseGraphic(a),exerciseGraphic(b));});
test('unknown IDs safely return null',()=>{for(const id of ['constructor','__proto__','../test','custom-1',null]){assert.equal(exerciseGraphic(id),null);assert.equal(categoryGraphic(id),null);}});
test('category keys match catalog IDs',()=>{assert.equal(categoryGraphic('Klatka piersiowa'),'./assets/graphics-r6/category-01.webp');assert.equal(categoryGraphic('__cardio__'),'./assets/graphics-r6/category-12.webp');});
