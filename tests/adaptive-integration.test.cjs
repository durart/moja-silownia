'use strict';
const release=require('./release-surfaces.cjs');
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
  for(const name of ['adaptive-evidence','adaptive-prescription','adaptive-trends','adaptive-recovery','adaptive-explanation','adaptive-adapter']){
   const surface=prefix?'preview':'production';const url='./'+release.assetUrl(surface,'assistant/'+name+'.js',name==='adaptive-adapter'?2:1);
   assert.ok(html.includes(url));assert.ok(sw.includes(url));
   if(prefix)release.assertParity('assistant/'+name+'.js',Buffer.from(read('assistant/'+name+'.js')),Buffer.from(read(prefix+'assistant/'+name+'.js')));
   assert.ok(html.indexOf(url)<html.indexOf('./'+release.assetUrl(surface,'assistant/trainer-preparation.js',313)));
  }
 }
 assert.notEqual(read('sw.js').match(/const CACHE='([^']+)'/)[1],read('preview/sw.js').match(/const CACHE='([^']+)'/)[1]);
 assert.ok(read('preview/index.html').includes('moja-silownia-preview-v01'));
});

test('adaptive draft preserves manual edits and completed rows across mode changes',()=>{
 const drafts=require('../assistant/trainer-drafts.js');
 const state={startedAt:'test',activePlan:'A',activeSessionMode:'standard',exercises:[input.exercise],sessions};
 const before=JSON.stringify(sessions);
 drafts.initialize(state);
 const entry=drafts.ensure(state,'bench',0,input.target).entry;
 assert.equal(entry.rows[1].weight,72.5);
 assert.equal(drafts.change(state,'bench',0,1,'weight',67.5),true);
 assert.equal(drafts.ensure(state,'bench',0,input.target).entry.rows[1].weight,67.5);
 drafts.capture(state,'bench',0,2,{weight:65,reps:9,rir:2,setType:'W'});
 state.activeSessionMode='recovery';
 drafts.refreshMode(state,'bench',0,input.target);
 assert.equal(drafts.row(state,'bench',0,1).weight,67.5);
 assert.equal(drafts.row(state,'bench',0,2).reps,9);
 assert.equal(JSON.stringify(sessions),before);
});

test('declining performance holds working sets and preserves warmup',()=>{const history=sessions.map((s,i)=>({...s,sets:s.sets.map(r=>({...r,rir:2+i}))}));const result=prepare({...input,sessions:history});assert.equal(result.rows[0].weight,20);assert.equal(result.rows[1].weight,70);assert.equal(result.rows[2].reps,10);});

test('broad plan decline blocks progression of a stable exercise',()=>{const plan={id:'A',exerciseIds:['bench','b','c'],targets:[input.target,{sets:1},{sets:1}]};const history=sessions.map((s,i)=>({...s,sets:[...s.sets,...['b','c'].map((exerciseId,j)=>({exerciseId,planId:'A',planSlotIndex:j+1,planSetIndex:0,weight:50,reps:8+i*2,rir:2,setType:'W'}))]}));const adapter=require('../assistant/adaptive-adapter.js');assert.equal(adapter.assessPlan({sessions:history,plan}).status,'broad_decline');assert.equal(prepare({...input,sessions:history,plan}).rows[1].weight,70);assert.equal(adapter.assessPlan({sessions:history,plan:{...plan,id:'B'}}).status,'insufficient_data');});

test('recovery trims only trailing working rows and respects safety flags',()=>{const target={sets:5,reps:'8-12',rir:2,setDetails:[{setType:'R'},...Array.from({length:4},()=>({setType:'W'}))]};const history=[{date:new Date(now).toISOString(),sets:[row(0,20,10,'R'),...Array.from({length:4},(_,i)=>row(i+1,80,10))]}];const args={...input,target,sessions:history,sessionMode:'recovery',adaptiveRecovery:true};const result=prepare(args);assert.equal(result.rows.length,4);assert.equal(result.rows[0].weight,20);assert.equal(result.rows[1].weight,70);assert.equal(prepare({...args,activeFlag:'pain'}).rows.length,5);const drafts=require('../assistant/trainer-drafts.js');const state={startedAt:'test',activePlan:'A',activeSessionMode:'standard',exercises:[input.exercise],sessions:history,preWorkout:{adaptiveRecovery:true}};drafts.initialize(state);drafts.ensure(state,'bench',0,target);drafts.change(state,'bench',0,4,'weight',77.5);state.activeSessionMode='recovery';drafts.refreshMode(state,'bench',0,target);assert.equal(drafts.row(state,'bench',0,4).weight,77.5);});

test('explanations survive JSON round trip and are removed by manual edits',()=>{const drafts=require('../assistant/trainer-drafts.js');const state={startedAt:'test',activePlan:'A',activeSessionMode:'standard',exercises:[input.exercise],sessions};drafts.initialize(state);drafts.ensure(state,'bench',0,input.target);const restored=JSON.parse(JSON.stringify(state));assert.equal(drafts.row(restored,'bench',0,1).explanation.reason,'increase_weight');assert.equal(drafts.row(restored,'bench',0,2).explanation.reason,'increase_reps');drafts.change(restored,'bench',0,1,'weight',67.5);assert.equal(drafts.row(restored,'bench',0,1).explanation,undefined);restored.trainerWorkout.entries['slot:0'].rows[2].explanation={reason:'<script>',observations:3};assert.equal(drafts.row(restored,'bench',0,2).explanation,undefined);});

test('alternating plans keep independent pyramid prescriptions for the same exercise',()=>{
 const other=sessions.map(s=>({...s,date:new Date(Date.parse(s.date)-86400000).toISOString(),sets:s.sets.map(r=>({...r,planId:'B',weight:r.setType==='R'?20:r.weight+20}))}));
 const mixed=[...sessions,...other];
 const before=JSON.stringify(mixed);
 assert.equal(prepare({...input,sessions:mixed}).rows[1].weight,72.5);
 assert.equal(prepare({...input,sessions:mixed,planId:'B'}).rows[1].weight,92.5);
 assert.equal(JSON.stringify(mixed),before);
});
test('adaptive strength evidence cannot use a different slot or plan',()=>{
 const adapter=require('../assistant/adaptive-adapter.js');
 const args={sessions,exerciseId:'bench',planId:'A',slotIndex:0,targets:[{index:1,min:8,max:12,rir:2},{index:2,min:8,max:12,rir:2}],equipmentType:'barbell',now};
 assert.ok(adapter.evaluate(args));
 assert.equal(adapter.evaluate({...args,planId:'B'}),null);
 assert.equal(adapter.evaluate({...args,slotIndex:1}),null);
});
test('calisthenics execution context stays separate from strength evidence',()=>{
 const calisthenics=require('../modules/calisthenics-progression.js');
 const move={id:'pushup',type:'reps',target:12};
 assert.notEqual(calisthenics.key(move),calisthenics.key({...move,type:'duration'}));
 assert.notEqual(calisthenics.key(move),calisthenics.key({...move,pauseSeconds:2}));
 const adapter=require('../assistant/adaptive-adapter.js');
 const history=sessions.map(s=>({...s,sets:s.sets.map(r=>({...r,weight:0}))}));
 assert.equal(adapter.evaluate({sessions:history,exerciseId:'bench',planId:'A',slotIndex:0,targets:[{index:1,min:8,max:12,rir:2},{index:2,min:8,max:12,rir:2}],equipmentType:'barbell',now}),null);
});

test('RIR zero is valid evidence but does not justify increasing weight at failure',()=>{
 const history=sessions.map(s=>({...s,sets:s.sets.map(r=>({...r,rir:0}))}));
 const adapter=require('../assistant/adaptive-adapter.js');
 const result=adapter.evaluate({sessions:history,exerciseId:'bench',planId:'A',slotIndex:0,targets:[{index:1,min:8,max:12,rir:0},{index:2,min:8,max:12,rir:0}],equipmentType:'barbell',now});
 assert.ok(result);assert.equal(result.recommendations[0].weight,70);assert.equal(result.recommendations[1].reps,10);
});

test('manual removal survives ordinary recovery and return to standard',()=>{
 const drafts=require('../assistant/trainer-drafts.js');
 const state={startedAt:'test',activePlan:'A',activeSessionMode:'standard',exercises:[input.exercise],sessions};
 const before=JSON.stringify(sessions);drafts.initialize(state);drafts.ensure(state,'bench',0,input.target);
 assert.equal(drafts.removeRow(state,'bench',0,2),true);
 for(const mode of ['recovery','standard']){state.activeSessionMode=mode;drafts.refreshMode(state,'bench',0,input.target);assert.equal(drafts.get(state,'bench',0).rows.length,2);}
 assert.equal(JSON.stringify(sessions),before);
});
test('swapping exercise in a plan slot never reuses the previous draft',()=>{
 const drafts=require('../assistant/trainer-drafts.js');const replacement={id:'replacement',equipmentType:'barbell'};
 const state={startedAt:'test',activePlan:'A',activeSessionMode:'standard',exercises:[input.exercise,replacement],sessions};
 drafts.initialize(state);drafts.ensure(state,'bench',0,input.target);state.workoutSwaps={0:'replacement'};
 assert.equal(drafts.get(state,'replacement',0),null);
 const entry=drafts.ensure(state,'replacement',0,{sets:2,reps:'8-12',rir:2}).entry;
 assert.equal(entry.exerciseId,'replacement');assert.ok(entry.rows.every(r=>r.weight===null&&!r.explanation));
});

test('automatic recovery restores planned volume on return to standard',()=>{
 const drafts=require('../assistant/trainer-drafts.js');
 const target={sets:5,reps:'8-12',rir:2,setDetails:[{setType:'R'},...Array.from({length:4},()=>({setType:'W'}))]};
 const history=[{date:new Date(now).toISOString(),sets:[row(0,20,10,'R'),...Array.from({length:4},(_,i)=>row(i+1,80,10))]}];
 const state={startedAt:'test',activePlan:'A',activeSessionMode:'standard',exercises:[input.exercise],sessions:history,preWorkout:{adaptiveRecovery:true}};
 const before=JSON.stringify(history);drafts.initialize(state);drafts.ensure(state,'bench',0,target);
 state.activeSessionMode='recovery';drafts.refreshMode(state,'bench',0,target);
 assert.equal(drafts.get(state,'bench',0).rows.length,4);
 state.activeSessionMode='standard';state.preWorkout={};drafts.refreshMode(state,'bench',0,target);
 assert.equal(drafts.get(state,'bench',0).rows.length,5);assert.equal(JSON.stringify(history),before);
});
test('manually appended and captured rows survive mode transitions',()=>{
 const drafts=require('../assistant/trainer-drafts.js');
 const state={startedAt:'test',activePlan:'A',activeSessionMode:'standard',exercises:[input.exercise],sessions,preWorkout:{adaptiveRecovery:true}};
 const before=JSON.stringify(sessions);drafts.initialize(state);drafts.ensure(state,'bench',0,input.target);
 assert.equal(drafts.append(state,'bench',0,{weight:60,reps:9,setType:'W'}),true);
 drafts.capture(state,'bench',0,1,{weight:67.5,reps:8,rir:0,setType:'W'});
 for(const mode of ['recovery','standard']){state.activeSessionMode=mode;drafts.refreshMode(state,'bench',0,input.target);assert.equal(drafts.get(state,'bench',0).rows.length,4);assert.equal(drafts.row(state,'bench',0,3).weight,60);assert.equal(drafts.row(state,'bench',0,1).rir,0);}
 assert.equal(JSON.stringify(sessions),before);
});

test('legacy version-one workout draft survives candidate normalization and mode change',()=>{
 const drafts=require('../assistant/trainer-drafts.js');
 const state={startedAt:'legacy-start',activePlan:'A',activeSessionMode:'standard',exercises:[input.exercise],sessions,trainerSettings:{weights:true,reps:true,sets:true,explanation:false}};
 drafts.initialize(state);drafts.ensure(state,'bench',0,input.target);
 drafts.change(state,'bench',0,1,'weight',67.5);
 const legacy=JSON.parse(JSON.stringify(state));
 for(const entry of Object.values(legacy.trainerWorkout.entries)){delete entry.adaptiveResized;delete entry.manualSetCount;for(const row of entry.rows)delete row.explanation;}
 const before=JSON.stringify({sessions:legacy.sessions,settings:legacy.trainerSettings});
 assert.equal(legacy.trainerWorkout.version,1);
 assert.equal(drafts.ensure(legacy,'bench',0,input.target).changed,true);
 assert.equal(drafts.row(legacy,'bench',0,1).weight,67.5);
 assert.equal(drafts.ensure(legacy,'bench',0,input.target).changed,false);
 legacy.activeSessionMode='recovery';drafts.refreshMode(legacy,'bench',0,input.target);
 assert.equal(drafts.row(legacy,'bench',0,1).weight,67.5);assert.equal(JSON.stringify({sessions:legacy.sessions,settings:legacy.trainerSettings}),before);
});
