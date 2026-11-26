'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const core=read('progress-core-v2.js'),ui=read('progress-ui-v2.js'),report=read('progress-report-dashboard.js');
function fixture({stale=false,missing=false,empty=false}={}){
 const target={innerHTML:''};
 const state={sessions:empty?[]:[{date:new Date().toISOString(),sets:[{exerciseId:'bench',weight:65,reps:9,rir:2}]}],exercises:[{id:'bench',name:'Wyciskanie',group:'Klatka piersiowa'}],profile:{weightHistory:[]}};
 const ctx={state,document:{getElementById:()=>target},console:{error(){}},Intl};
 ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
 if(!missing)vm.runInContext(core,ctx);
 if(stale)ctx.ProgressCore={...ctx.ProgressCore,trainingBreaks:undefined};
 vm.runInContext(report,ctx);vm.runInContext(ui,ctx);
 return {ctx,target,state};
}
test('old cached analytics core produces an actionable error, not an empty screen',()=>{
 const {ctx,target,state}=fixture({stale:true});const before=JSON.stringify(state);
 assert.doesNotThrow(()=>ctx.renderProgress());assert.match(target.innerHTML,/Nie udało się wyświetlić postępów/);assert.match(target.innerHTML,/Odśwież aplikację/);assert.equal(JSON.stringify(state),before);
});
test('missing analytics core never leaves a blank tab',()=>{const {ctx,target}=fixture({missing:true});ctx.renderProgress();assert.match(target.innerHTML,/Odśwież aplikację/);});
test('all three views render when there is no history',()=>{const {ctx,target}=fixture({empty:true});for(const view of ['overview','exercise','reports']){ctx.progressView(view);assert.match(target.innerHTML,/Postępy/);assert.doesNotMatch(target.innerHTML,/Nie udało się wyświetlić/);}});
test('realistic history renders overview, exercises and full reports without changing data',()=>{const {ctx,target,state}=fixture();const before=JSON.stringify(state);ctx.progressView('overview');assert.match(target.innerHTML,/Diagnostyka treningowa/);ctx.progressView('exercise');assert.match(target.innerHTML,/Wyciskanie/);ctx.progressView('reports');assert.match(target.innerHTML,/Podsumowanie okresowe/);assert.match(target.innerHTML,/585 kg/);assert.equal(JSON.stringify(state),before);});
test('production and preview use new, identical analytics asset versions and isolated caches',()=>{for(const prefix of ['', 'preview/']){const html=read(prefix+'index.html'),sw=read(prefix+'sw.js');for(const name of ['progress-core-v2.js','progress-ui-v2.js','progress-report-dashboard.js']){assert.ok(html.includes(name+'?v='+'313'));assert.ok(sw.includes(name+'?v='+'313'));}assert.match(sw,prefix?/moja-silownia-preview-shell-v55-graphics-r6-3\.7\.1/:/moja-silownia-shell-v55-graphics-r6-3\.7\.1/);assert.match(html,prefix?/v3\.7\.1/:/v3\.7\.1/);assert.match(html,/function showProgress\(/);assert.match(html,/Ładowanie analizy treningów/);}assert.match(read('index.html'),/const key='moja-silownia-v01'/);assert.match(read('preview/index.html'),/const key='moja-silownia-preview-v01'/);});
test('actual progress navigation renders even when refresh of an unrelated view fails',()=>{
 const html=read('index.html'),from=html.indexOf('function showProgress(){'),to=html.indexOf('\nfunction safe(',from);
 const root={innerHTML:''};const elements={};for(const id of ['dashboard','workout','plans','catalog','history','summary','progress','profile'])elements[id]={classList:{toggle(){}}};elements.progressContent=root;
 const ctx={currentTab:'dashboard',document:{getElementById:id=>elements[id]},window:{renderProgress:()=>{root.innerHTML='Raporty';}},render(){throw Error('unrelated renderer')},console:{error(){}}};
 vm.createContext(ctx);vm.runInContext(html.slice(from,to),ctx);ctx.tab('progress');assert.equal(root.innerHTML,'Raporty');delete ctx.window.renderProgress;ctx.tab('progress');assert.match(root.innerHTML,/Odśwież aplikację/);
});
