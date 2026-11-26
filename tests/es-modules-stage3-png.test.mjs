import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const {renderWorkoutPNG}=await import('data:text/javascript;base64,'+Buffer.from(read('modules/workout-png.js')).toString('base64'));
function fixture(){
 const texts=[],notes=[],downloads=[];
 const ctx={fillRect(){},fillText(value){texts.push(value)},measureText(value){return {width:String(value).length*15}}};
 const canvas={getContext:()=>ctx,toBlob:cb=>cb(new Blob(['png'],{type:'image/png'}))};
 const document={createElement(tag){if(tag==='canvas')return canvas;return {click(){downloads.push(this.download)},remove(){},href:'',download:''}},body:{append(){}}};
 const deps={drawAnatomyPNG:async()=>{},estimateCalories:()=>({active:210}),formatTime:()=> '1:00:00',note:msg=>notes.push(msg),document,navigator:{},URL:{createObjectURL:()=> 'blob:mock',revokeObjectURL(){}},File:class{constructor(parts,name){this.parts=parts;this.name=name}}};
 const session={id:1,date:'2026-11-21T18:00:00.000Z',planName:'Trening A',sets:[{exerciseId:'a',name:'Wyciskanie',weight:60,reps:10,pr:['Ciężar']}],durationSeconds:3600,calories:{active:210}};
 return {texts,notes,downloads,deps,session};
}
test('renders existing workout metrics and PR',async()=>{const f=fixture();await renderWorkoutPNG(f.session,f.deps);assert.ok(f.texts.includes('Trening A'));assert.ok(f.texts.includes('600 kg'));assert.ok(f.texts.some(t=>String(t).includes('PR:')));assert.ok(f.downloads[0].endsWith('.png'))});
test('shares PNG on supported mobile browsers',async()=>{const f=fixture();let shared=false;f.deps.navigator={canShare:()=>true,share:async()=>{shared=true}};await renderWorkoutPNG(f.session,f.deps);assert.equal(shared,true);assert.equal(f.downloads.length,0)});
test('does not download after cancelled share',async()=>{const f=fixture();f.deps.navigator={canShare:()=>true,share:async()=>{const e=new Error('cancelled');e.name='AbortError';throw e}};await renderWorkoutPNG(f.session,f.deps);assert.equal(f.downloads.length,0)});
test('entrypoint and service worker point to same module',()=>{assert.match(read('index.html'),/import\('\.\/modules\/workout-png\.js\?v=2'\)/);assert.ok(read('sw.js').includes("'./modules/workout-png.js?v=2'"))});
