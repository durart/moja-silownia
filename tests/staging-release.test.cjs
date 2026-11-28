'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const release=require('./release-surfaces.cjs');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name));
const production=require('../muscle-fatigue-core.js');
const preview=require('../preview/muscle-fatigue-core.js');
const art=require('../preview/muscle-anatomy-art.js');
test('each surface uses its independently declared version, cache and storage key',()=>{
 for(const [name,config] of Object.entries(release.surfaces)){
  const prefix=name==='preview'?'preview/':'';
  const html=read(prefix+'index.html').toString(),sw=read(prefix+'sw.js').toString();
  assert.match(html,release.versionPattern(name,name==='preview'?'TEST v':'v'));
  assert.ok(html.includes("const key='"+config.storageKey+"'"));
  assert.ok(sw.includes("const CACHE='"+config.cache+"'"));
  assert.match(sw,release.cachePattern(name));
  const moduleUrl=html.match(/muscle-fatigue-core\.js\?v=\d+/)?.[0];
  assert.ok(moduleUrl);assert.ok(sw.includes(moduleUrl));
 }
 assert.notEqual(release.surfaces.production.storageKey,release.surfaces.preview.storageKey);
 assert.notEqual(release.surfaces.production.cache,release.surfaces.preview.cache);
 assert.match(read('sw.js').toString(),/new URL\('preview\/',self.registration.scope\)/);
});
test('pinned differing module rejects unreviewed content; other assets retain strict equality',()=>{
 const root=read('muscle-fatigue-core.js'),stage=read('preview/muscle-fatigue-core.js');
 release.assertParity('muscle-fatigue-core.js',root,stage);
 assert.throws(()=>release.assertParity('muscle-fatigue-core.js',Buffer.concat([root,Buffer.from('x')]),stage));
 assert.throws(()=>release.assertParity('muscle-fatigue-core.js',root,Buffer.concat([stage,Buffer.from('x')])));
 assert.throws(()=>release.assertParity('profile-core.js',Buffer.from('x'),Buffer.from('y')));
});
test('preview corrects four historical calf sets without rewriting history or production',()=>{
 const exercise={id:'seed-12',name:'Wspięcia na palce',group:'Nogi'};
 const session={id:'sample',date:'2026-11-28T10:00:00Z',sets:Array.from({length:4},(_,i)=>({exerciseId:'seed-12',weight:30,reps:12,rir:i===3?0:2})),fatigueModel:2,fatigueImpulse:{Nogi:45},muscles:{Nogi:4}};
 const before=JSON.stringify(session);
 if(release.surfaces.production.version==='4.1.0')assert.deepEqual(production.profile(exercise),[['Nogi',1]]);
 else {assert.deepEqual(production.profile(exercise),[['Łydki',1]]);assert.deepEqual(production.sessionMuscles(session,[exercise]),{'Łydki':4});}
 const corrected=preview.normalizeCatalog([exercise]);assert.equal(corrected[0].group,'Łydki');
 assert.equal(exercise.group,'Nogi');assert.deepEqual(preview.sessionMuscles(session,[exercise]),{'Łydki':4});
 const impulse=preview.sessionImpulse(session,[exercise]);assert.ok(impulse['Łydki']>0);assert.equal(impulse.Nogi,undefined);
 const roles=Object.fromEntries(preview.factors(session.sets[0],[exercise]));
 const svg=art.renderSession(roles,640);const calves=[...svg.matchAll(/<path[^>]+data-muscle="Łydki"[^>]+>/g)].map(m=>m[0]);assert.ok(calves.length);assert.ok(calves.every(tag=>tag.includes('data-summary="main"')));
 assert.equal(JSON.stringify(session),before);
});
