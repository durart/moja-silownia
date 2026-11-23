'use strict';
/* Real-browser smoke test for photo alignment, selection, and Canvas PNG export.
 * CI-only dependency: Playwright Chromium; the shipped app needs no packages.
 */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

async function run(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const viewport of [{width:390,height:844},{width:1100,height:850}]){
   const page=await browser.newPage({viewport,deviceScaleFactor:1});
   const errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.setContent('<!doctype html><html lang="pl"><head><meta charset="utf-8"></head><body><div id="dashboard"><div class="dash-recovery"></div></div></body></html>');
   for(const moduleFile of ['musclemap-hybrid-assets.js','muscle-anatomy-art.js','muscle-atlas-core.js']){
    await page.addScriptTag({path:path.join(root,moduleFile)});
   }
   await page.addStyleTag({path:path.join(root,'muscle-atlas.css')});
   await page.evaluate(()=>{
    window.state={sessions:[],exercises:[]};
    window.MuscleFatigueCore={fatigue:()=>({'Klatka piersiowa':27,'Barki':13,'Nogi':0})};
    window.renderDashboard=()=>{};
    window.tab=()=>{};
    window.selectMuscle=()=>{};
   });
   await page.addScriptTag({path:path.join(root,'muscle-atlas-ui.js')});
   await page.waitForSelector('#muscleAtlas svg[data-mode="atlas"]');
   const result=await page.evaluate(async()=>{
    const host=document.querySelector('#muscleAtlas');
    const svg=host.querySelector('svg');
    const photoPaths=[...svg.querySelectorAll('image.mm-photo')];
    const pathElements=[...svg.querySelectorAll('.muscle-region')];
    // CSS viewBox scaling must be coherent for both front and back figures.
    const rootBox=svg.getBoundingClientRect();
    const frontBox=svg.querySelectorAll('.mm-figure')[0].getBoundingClientRect();
    const backBox=svg.querySelectorAll('.mm-figure')[1].getBoundingClientRect();
    const images=await Promise.all(photoPaths.map(image=>{
     const href=image.getAttribute('href');
     const probe=new Image();
     probe.src=href;
     await probe.decode();
     return {width:probe.naturalWidth,height:probe.naturalHeight};
    }));
    // Render the actual SVG through Image -> Canvas to detect broken nested WebP.
    const canvas=document.createElement('canvas');
    canvas.width=900;
    canvas.height=700;
    const ctx=canvas.getContext('2d');
    await window.MuscleAnatomyArt.drawSession(ctx,{'Nogi':1,'Barki':0.5},0,0,900);
    const sample=(x,y)=>[...ctx.getImageData(x,y,1,1).data];
    return {
     pathCount:pathElements.length,
     imageCount:photoPaths.length,
     images,
     rootWidth:rootBox.width,
     frontWidth:frontBox.width,
     backWidth:backBox.width,
     figureSpacing:backBox.x-frontBox.x,
     selected:svg.querySelectorAll('path[data-selected="true"]').length,
     // Image foreground (uncolored head) should not be identical to transparent background.
     head:sample(216,55),
     background:sample(10,15)
    };
   });
   assert.equal(result.pathCount,56,'all paths');
   assert.equal(result.imageCount,2,'both embedded images');
   assert.deepEqual(result.images,[{width:1024,height:1536},{width:1024,height:1536}]);
   assert.equal(result.selected,0,'initially neutral overview');
   assert.ok(result.frontWidth>30 && result.backWidth>30,'figures scale');
   assert.ok(result.figureSpacing>result.frontWidth,'views do not overlap');
   assert.notDeepEqual(result.head,result.background,'SVG raster export contains the uncolored portrait');
   await page.locator('.ma-chip[data-muscle="Barki"]').click();
   let selected=await page.locator('path.muscle-region[data-selected="true"]').evaluateAll(paths=>paths.map(x=>x.getAttribute('data-muscle')));
   assert.ok(selected.length>=4 && selected.every(x=>x==='Barki'));
   assert.equal(await page.locator('#muscleAtlas svg').getAttribute('data-view'),'focused');
   await page.locator('[data-ma-reset]').click();
   assert.equal(await page.locator('path.muscle-region[data-selected="true"]').count(),0);
   assert.equal(await page.locator('#muscleAtlas svg').getAttribute('data-view'),'overview');
   assert.deepEqual(errors,[],'no uncaught browser exceptions');
   console.log('PASS: real Chromium',viewport.width,'px, images, 56 paths, selection, reset, PNG raster');
   await page.close();
  }
 }finally{await browser.close()}
}
run().catch(error=>{console.error(error);process.exitCode=1});
