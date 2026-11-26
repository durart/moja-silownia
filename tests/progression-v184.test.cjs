const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const advisor=require('../preview/assistant/assistant-progression.js');

const session=(date,sets,exerciseNotes)=>({date,sets,exerciseNotes});
const rows=(weights,reps=12,rir=2)=>weights.map(weight=>({exerciseId:'row-v',weight,reps,rir,setType:'W'}));
const days=['2026-11-20T12:00:00Z','2026-11-18T12:00:00Z','2026-11-15T12:00:00Z'];

test('mixed working weights never take the first light set as the working load',()=>{
 const result=advisor.suggest([session(days[0],rows([29,45,55,63]))],'row-v');
 assert.equal(result.weight,63);
 assert.equal(result.lastTopWeight,63);
 assert.equal(result.bestWeight,63);
 assert.equal(result.action,'maintain');
 assert.equal(result.sessionCount,1);
});

test('highest working load prevents back-off sets from hiding the pyramid peak',()=>{
 const result=advisor.suggest([session(days[0],rows([29,55,55,63]))],'row-v');
 assert.equal(result.weight,63);
 assert.equal(result.lastTopWeight,63);
 assert.equal(result.action,'maintain');
 assert.match(result.reason,/piramidzie/);
});

test('historical personal best remains visible after a lighter training day',()=>{
 const result=advisor.suggest([session(days[0],rows([45,45])),session(days[1],rows([63,63]))],'row-v');
 assert.equal(result.weight,45);
 assert.equal(result.bestWeight,63);
});

test('warmup rows and invalid entries never influence the load',()=>{
 const result=advisor.suggest([session(days[0],[
  {exerciseId:'row-v',weight:95,reps:4,setType:'R'},
  {exerciseId:'row-v',weight:100,reps:3,type:'warmup'},
  {exerciseId:'row-v',weight:0,reps:0},
  {exerciseId:'other',weight:150,reps:12},
  ...rows([55,55])
 ])],'row-v');
 assert.equal(result.weight,55);
 assert.equal(result.bestWeight,55);
});

test('three comparable sessions with RIR at least 2 allow a tentative increase',()=>{
 const history=days.map(date=>session(date,rows([60,60],12,2)));
 const result=advisor.suggest(history,'row-v');
 assert.equal(result.action,'consider_increase');
 assert.equal(result.suggestedWeight,62.5);
});

test('only one session cannot trigger the same increase',()=>{
 assert.equal(advisor.suggest([session(days[0],rows([60,60]))],'row-v').action,'maintain');
});

test('missing RIR does not erase history and prevents weight increase',()=>{
 const history=days.map(date=>session(date,rows([60,60],12,null)));
 const result=advisor.suggest(history,'row-v');
 assert.equal(result.action,'maintain');
 assert.match(result.reason,/RIR/);
 assert.equal(result.bestWeight,60);
});

test('pain, changed equipment and technique markers block weight increases',()=>{
 for(const flag of ['pain','equipment','technique']){
  const history=days.map((date,i)=>session(date,rows([60,60]),i===0?{'row-v':{flag}}:undefined));
  assert.equal(advisor.suggest(history,'row-v').action,'review');
 }
});

test('bodyweight workouts never offer kilograms',()=>{
 const history=days.map(date=>session(date,rows([0,0])));
 assert.equal(advisor.suggest(history,'row-v').action,'maintain');
});

test('incomplete history does not fabricate prior weights',()=>{
 const result=advisor.suggest([],'row-v');
 assert.equal(result.action,'insufficient_data');
 assert.equal(result.weight,undefined);
});

test('advisor cannot modify stored workout data',()=>{
 const history=days.map(date=>session(date,rows([60,60])));
 const snapshot=JSON.stringify(history);
 advisor.suggest(history,'row-v');
 assert.equal(JSON.stringify(history),snapshot);
});

test('isolated staging uses its own storage, script version and offline cache',()=>{
 const root=path.join(__dirname,'..');
 const html=fs.readFileSync(path.join(root,'preview/index.html'),'utf8');
 const sw=fs.readFileSync(path.join(root,'preview/sw.js'),'utf8');
 assert.match(html,/const key='moja-silownia-preview-v01'/);
 assert.doesNotMatch(html,/const key='moja-silownia-v01'/);
 assert.match(html,/\.\/assistant\/assistant-progression\.js\?v=201/);
 assert.match(html,/\.\/assistant\/assistant-progression-ui\.js\?v=311/);
 assert.match(sw,/moja-silownia-preview-shell-v51-cardio-3\.5\.0/);
 assert.match(sw,/\.\/assistant\/assistant-progression\.js\?v=201/);
 assert.doesNotMatch(sw,/const CACHE='moja-silownia-shell-/);
});

test('production v2 retains storage while the staging sandbox remains isolated',()=>{
 const root=path.join(__dirname,'..');
 const staging=fs.readFileSync(path.join(root,'preview/assistant/assistant-progression.js'),'utf8');
 const production=fs.readFileSync(path.join(root,'assistant/assistant-progression.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.match(staging,/REPS_TREND_CONFIRMED/);
 assert.match(html,/const key='moja-silownia-v01'/);
 assert.match(html,/v3\.4\.0/);
 assert.match(html,/assistant\/assistant-progression\.js\?v=201/);
 assert.match(sw,/moja-silownia-shell-v50-isometric-3.4.0/);
 assert.match(sw,/assistant\/assistant-progression\.js\?v=201/);
});
