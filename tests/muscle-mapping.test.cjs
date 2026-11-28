'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const core=require('../muscle-fatigue-core.js');
const art=require('../muscle-anatomy-art.js');
const atlas=require('../muscle-atlas-core.js');
const catalog=require('../exercise-catalog-shared.js');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const calves=['seed-12','seed-84','seed-85','seed-100','seed-101','seed-102'];
const legacy=calves.map(id=>({id,group:calves.indexOf(id)<3?'Nogi':'Łydki',name:id}));
const corrected=core.normalizeCatalog(legacy);
const sets=Array.from({length:4},(_,i)=>({exerciseId:'seed-12',name:'Wspięcia na palce',weight:30,reps:12,rir:i===3?0:2,pr:i===3?['weight']:[]}));
const session={id:'legacy',date:'2026-11-28T10:00:00Z',sets,fatigueModel:2,fatigueImpulse:{Nogi:45},muscles:{Nogi:4}};
test('six built-in calf exercises map to calves, including old stored groups',()=>{
 for(const ex of corrected){assert.deepEqual(core.profile(ex),[['Łydki',1]],ex.id);assert.equal(catalog.matches(ex,'Łydki'),true);assert.equal(catalog.matches(ex,'Nogi'),false);}
 assert.equal(legacy[0].group,'Nogi');
 for(const id of ['seed-12','seed-84','seed-85'])assert.deepEqual(core.profile({id,group:'Nogi'}),[['Łydki',1]]);
});
test('existing catalog metadata correction is stable, scoped and idempotent',()=>{
 const input=[{id:'seed-50',group:'Barki',groups:['Barki','Kalistenika'],name:'Szrugsy',custom:'keep'},{id:'custom',name:'Wspięcia na palce',group:'Nogi'},...legacy];
 const before=JSON.stringify(input);const mapped=core.normalizeCatalog(input);
 assert.equal(JSON.stringify(input),before);assert.equal(mapped[0].group,'Plecy');assert.deepEqual(mapped[0].groups,['Kalistenika','Plecy']);assert.equal(mapped[0].custom,'keep');assert.deepEqual(mapped[1],input[1]);assert.deepEqual(core.normalizeCatalog(mapped),mapped);
});
test('all 64 calisthenics definitions have a real anatomical profile',()=>{
 const source=read('calisthenics-library.js');const library=JSON.parse(source.slice(source.indexOf('['),source.lastIndexOf(']')+1));
 assert.equal(library.length,64);
 for(const ex of library){assert.ok(Object.hasOwn(core.SPECIFIC,ex.id),ex.id);const profile=core.profile(ex);assert.ok(profile.length>0,ex.id);for(const [name,weight] of profile){assert.ok(atlas.MUSCLES.includes(name),ex.id+' '+name);assert.ok(weight>0&&weight<=1,ex.id);}}
 const first=core.normalizeCatalog(library.slice(0,22));for(const ex of first){assert.equal(ex.group,'Kalistenika');assert.ok(ex.groups.length>0,ex.id);}
});
test('isolation exercises do not acquire irrelevant default muscles',()=>{
 for(const id of ['seed-19','seed-20','seed-21','seed-22','seed-43','seed-44','seed-45'])assert.ok(!core.profile({id}).some(([name])=>name==='Triceps'),id);
 for(const id of ['seed-31','seed-37','seed-38'])assert.ok(!core.profile({id}).some(([name])=>name==='Biceps'),id);
 assert.equal(core.profile({id:'seed-50',group:'Barki'})[0][0],'Plecy');
});
test('reported four sets are red calves and never red thighs in the isolated report',()=>{
 const roles=Object.fromEntries(core.factors(sets[0],legacy));assert.deepEqual(roles,{'Łydki':1});
 const svg=art.renderSession(roles,640);const tags=[...svg.matchAll(/<path[^>]+data-muscle="Łydki"[^>]+>/g)].map(m=>m[0]);assert.ok(tags.length>0);assert.ok(tags.every(tag=>tag.includes('data-summary="main"')));
 assert.doesNotMatch(svg,/<path[^>]+data-muscle="Nogi"[^>]+data-summary="main"/);
});
test('historical derived scores correct at read time without modifying raw history',()=>{
 const before=JSON.stringify(session);
 assert.deepEqual(core.sessionMuscles(session,legacy),{'Łydki':4});
 const impulse=core.sessionImpulse(session,legacy);assert.ok(impulse['Łydki']>0);assert.equal(impulse.Nogi,undefined);
 const model=atlas.buildModel([session],legacy,core,Date.parse(session.date));assert.ok(atlas.getMuscle(model,'Łydki').score>0);assert.equal(atlas.getMuscle(model,'Nogi').score,0);
 assert.equal(JSON.stringify(session),before);
});
test('mixed exercise history retains thigh and calf loads separately',()=>{
 const mixed={...session,sets:[...sets,{exerciseId:'seed-9',weight:100,reps:12,rir:2}]};
 const exercises=[...legacy,{id:'seed-9',group:'Nogi'}];assert.deepEqual(core.sessionMuscles(mixed,exercises),{'Łydki':4,Nogi:1});const result=core.sessionImpulse(mixed,exercises);assert.ok(result['Łydki']>0&&result.Nogi>0);
});
test('unresolved mixed legacy data preserves stored scores; unrelated sessions are unchanged',()=>{
 const partial={...session,sets:[...sets,{exerciseId:'deleted-custom',weight:30,reps:10}]};assert.equal(core.sessionImpulse(partial,legacy),partial.fatigueImpulse);assert.equal(core.sessionMuscles(partial,legacy),partial.muscles);
 const unrelated={...session,sets:[{exerciseId:'seed-9',weight:100,reps:10}]};assert.equal(core.sessionImpulse(unrelated,legacy),unrelated.fatigueImpulse);
 assert.deepEqual(core.sessionImpulse({...session,sets:[]},legacy),{Nogi:45});
});
test('same canonical source in both candidate surfaces, with isolated keys and cache',()=>{
 assert.equal(read('muscle-fatigue-core.js'),read('preview/muscle-fatigue-core.js'));
 for(const prefix of ['', 'preview/']){const html=read(prefix+'index.html');const sw=read(prefix+'sw.js');assert.ok(html.includes('MuscleFatigueCore.normalizeCatalog(state.exercises)'));assert.ok(html.includes('MuscleFatigueCore.sessionMuscles(s,state.exercises)'));assert.ok(html.includes('muscle-fatigue-core.js?v=6'));assert.ok(sw.includes('muscle-fatigue-core.js?v=6'));assert.ok(sw.includes('v64-4.1.1'));}
 assert.match(read('index.html'),/const key='moja-silownia-v01'/);assert.match(read('preview/index.html'),/const key='moja-silownia-preview-v01'/);
});
