'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {prepare}=require('../assistant/trainer-preparation.js');
const now=Date.now();
const row=(i,weight,reps,setType='W')=>({exerciseId:'bench',planId:'A',planSlotIndex:0,planSetIndex:i,weight,reps,rir:3,setType});
const sessions=[0,4,8].map(d=>({date:new Date(now-d*86400000).toISOString(),sets:[row(0,20,10,'R'),row(1,70,12),row(2,65,10)]}));
const input={sessions,exercise:{id:'bench',equipmentType:'barbell'},planId:'A',slotIndex:0,target:{sets:3,reps:'8-12',rir:2,setDetails:[{setType:'R',reps:'10'},{setType:'W'},{setType:'W'}]}};
test('trainer applies adaptive pyramid after warmup without mutating history',()=>{
 const before=JSON.stringify(input);const result=prepare(input);
 assert.equal(result.rows[0].weight,20);assert.equal(result.rows[1].weight,72.5);assert.equal(result.rows[2].reps,11);assert.equal(JSON.stringify(input),before);
});
test('readiness and pain retain existing safeguards',()=>{
 assert.equal(prepare({...input,preWorkout:{sleepHours:4}}).rows[1].weight,70);
 assert.equal(prepare({...input,activeFlag:'pain'}).rows[1].weight,null);
});
test('candidate shells register identical adaptive assets and isolated cache names',()=>{
 const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
 for(const prefix of ['', 'preview/']){
  const html=read(prefix+'index.html'),sw=read(prefix+'sw.js');
  for(const name of ['adaptive-evidence','adaptive-prescription','adaptive-adapter']){
   const url='./assistant/'+name+'.js?v=1';
   assert.ok(html.includes(url));assert.ok(sw.includes(url));
   assert.equal(read(prefix+'assistant/'+name+'.js'),read('assistant/'+name+'.js'));
   assert.ok(html.indexOf(url)<html.indexOf('./assistant/trainer-preparation.js?v=311'));
  }
 }
 assert.notEqual(read('sw.js').match(/const CACHE='([^']+)'/)[1],read('preview/sw.js').match(/const CACHE='([^']+)'/)[1]);
 assert.ok(read('preview/index.html').includes('moja-silownia-preview-v01'));
});
