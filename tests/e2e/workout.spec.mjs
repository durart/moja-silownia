import {test,expect} from '@playwright/test';

const KEY='moja-silownia-v01';
const fixture=()=>({
 exercises:[{id:'e1',name:'Pompki',group:'Klatka piersiowa',equipment:'Masa ciała'}],
 active:[],sessions:[{id:1700000000000,date:'2025-01-01T12:00:00.000Z',planName:'Archiwum',sets:[{exerciseId:'e1',weight:0,reps:10,at:'2025-01-01T12:00:00.000Z'}]}],
 plans:[{id:'p1',name:'Plan testowy',exerciseIds:['e1'],targets:{}}],
 activePlan:null,manualStarted:false,startedAt:null,restUntil:null,
 manualExerciseIds:[],planExtraExerciseIds:[],pendingWorkout:null,
 workoutSwaps:{},hiddenWorkoutSlots:[],planRowCounts:{},restSettings:{}
});

async function openWithFixture(page,data=fixture()){
 await page.addInitScript(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key:KEY,data});
 await page.goto('/');
 await expect(page.locator('#dashWorkoutTitle')).toBeVisible();
}
const stored=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);

// @smoke: catches startup exceptions like the workoutSelectors temporal-dead-zone crash.
test('@smoke application boots and navigation buttons respond without JavaScript exceptions',async({page})=>{
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await openWithFixture(page);
 await page.getByRole('button',{name:'Historia',exact:true}).click();
 await expect(page.locator('#history')).toBeVisible();
 await page.getByRole('button',{name:'Plany',exact:true}).click();
 await expect(page.locator('#plans')).toBeVisible();
 expect(errors).toEqual([]);
});

test('@smoke empty manual workout ends without losing history or plans',async({page})=>{
 await openWithFixture(page);
 await page.getByRole('button',{name:'Start',exact:true}).click();
 await page.getByRole('button',{name:'Rozpocznij trening',exact:true}).first().click();
 await page.getByRole('button',{name:'Zacznij trening',exact:true}).click();
 await page.getByRole('button',{name:'Rozpocznij trening',exact:true}).last().click();
 await expect(page.locator('#workoutRunningBadge')).toBeVisible();
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#workoutFinishButton').click();
 await expect(page.locator('#workoutRunningBadge')).toBeHidden();
 await expect(page.locator('#workoutFinishButton')).toBeHidden();
 const data=await stored(page);
 expect(data.startedAt).toBeNull();expect(data.manualStarted).toBe(false);
 expect(data.active).toEqual([]);expect(data.sessions).toHaveLength(1);
 expect(data.plans).toHaveLength(1);
 await page.reload();
 await expect(page.locator('#dashWorkoutTitle')).toHaveText('Gotowy na trening?');
});

test('empty plan workout ends and preserves the plan',async({page})=>{
 const data=fixture();data.activePlan='p1';data.startedAt='2026-11-21T10:00:00.000Z';
 await openWithFixture(page,data);
 await page.getByRole('button',{name:'Start',exact:true}).click();
 await page.getByRole('button',{name:'Rozpocznij trening',exact:true}).first().click();
 await expect(page.locator('#workoutFinishButton')).toBeVisible();
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#workoutFinishButton').click();
 const after=await stored(page);
 expect(after.activePlan).toBeNull();expect(after.startedAt).toBeNull();
 expect(after.plans).toEqual(data.plans);expect(after.sessions).toEqual(data.sessions);
});

test('finished workout with a saved set appears in history after reload',async({page})=>{
 const data=fixture();data.manualStarted=true;data.startedAt='2026-11-21T10:00:00.000Z';
 data.manualExerciseIds=['e1'];data.active=[{exerciseId:'e1',name:'Pompki',weight:0,reps:12,at:'2026-11-21T10:05:00.000Z',manualSetIndex:0}];
 await openWithFixture(page,data);
 await page.getByRole('button',{name:'Start',exact:true}).click();
 await page.getByRole('button',{name:'Rozpocznij trening',exact:true}).first().click();
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#workoutFinishButton').click();
 const after=await stored(page);
 expect(after.active).toEqual([]);expect(after.sessions).toHaveLength(2);
 expect(after.sessions[0].sets[0].reps).toBe(12);
 await page.reload();
 const reloaded=await stored(page);
 expect(reloaded.sessions).toHaveLength(2);
 expect(reloaded.plans).toEqual(data.plans);
});

test('JSON export contains plans and history, and import restores them',async({page})=>{
 await openWithFixture(page);
 const downloadPromise=page.waitForEvent('download');
 await page.evaluate(()=>exportData());
 const download=await downloadPromise;
 expect(download.suggestedFilename()).toMatch(/^moja-silownia-kopia-.*\.json$/);
 const text=await download.createReadStream().then(async stream=>{
  let result='';for await(const chunk of stream)result+=chunk.toString();return result;
 });
 const exported=JSON.parse(text);
 expect(exported.sessions).toHaveLength(1);expect(exported.plans).toHaveLength(1);
 const restored={...exported,plans:[...exported.plans,{id:'p2',name:'Po imporcie',exerciseIds:['e1'],targets:{}}]};
 const input=page.locator('input[type=file]').first();
 page.once('dialog',dialog=>dialog.accept());
 await input.setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(restored))});
 await expect.poll(async()=> (await stored(page)).plans.length).toBe(2);
 expect((await stored(page)).sessions).toHaveLength(1);
});
