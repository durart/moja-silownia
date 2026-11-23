/* Shared photoreal-hybrid SVG renderer for the atlas, summaries and PNG exports.
 * Muscle path geometry and photos: Jsplice/MuscleMap, MIT. See musclemap-license.txt.
 */
(function(root,factory){
 'use strict';
 const assets=(typeof module==='object'&&module.exports)
  ?require('./musclemap-hybrid-assets.js')
  :root.MuscleMapHybridAssets;
 const api=factory(assets);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MuscleAnatomyArt=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(assets){
 'use strict';
 if(!assets||!assets.diagrams||!assets.photos)throw new Error('MuscleMap hybrid assets unavailable');

 const WIDTH=2136;
 const HEIGHT=1615;
 const FIGURE_WIDTH=1024;
 const FIGURE_HEIGHT=1536;
 const GAP=88;
 const GROUP_NAMES=Object.freeze({
  CHEST:'Klatka piersiowa',
  TRAPEZIUS:'Plecy',
  RHOMBOIDS:'Plecy',
  LATS:'Plecy',
  BACK_LOWER:'Plecy',
  SHOULDERS_FRONT:'Barki',
  SHOULDERS_SIDE:'Barki',
  SHOULDERS_REAR:'Barki',
  BICEPS:'Biceps',
  TRICEPS:'Triceps',
  FOREARMS:'Przedramiona',
  CORE:'Brzuch',
  OBLIQUES:'Brzuch',
  QUADS:'Nogi',
  HAMSTRINGS:'Nogi',
  GLUTES:'Nogi',
  ADDUCTORS:'Nogi',
  ABDUCTORS:'Nogi',
  CALVES:'Łydki'
 });
 const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
 }[char]));

 const REGIONS=Object.freeze(['front','back'].flatMap(view=>
  assets.diagrams[view].muscles.map((path,index)=>Object.freeze({
   id:'mm-'+view+'-'+path.id+'-'+index,
   group:path.group,
   muscle:GROUP_NAMES[path.group],
   view
  }))
 ));
 if(REGIONS.some(region=>!region.muscle))throw new Error('Unmapped MuscleMap muscle group');

 const STYLE=[
  '.mm-hybrid{display:block;max-width:100%;height:auto;background:#09131c}',
  '.mm-hybrid .mm-photo{filter:grayscale(1) brightness(1.05) contrast(1.15)}',
  '.mm-hybrid .mm-muscle{cursor:pointer;pointer-events:all;fill:transparent;stroke:transparent;stroke-linejoin:round;transition:fill-opacity .13s ease,stroke-opacity .13s ease}',
  '.mm-hybrid[data-mode="atlas"][data-view="overview"] .mm-muscle[data-level="low"]{fill:#22c4b5;fill-opacity:.34;stroke:#22c4b5;stroke-opacity:.25;stroke-width:1.5}',
  '.mm-hybrid[data-mode="atlas"][data-view="overview"] .mm-muscle[data-level="medium"]{fill:#edaa37;fill-opacity:.38;stroke:#edaa37;stroke-opacity:.29;stroke-width:1.5}',
  '.mm-hybrid[data-mode="atlas"][data-view="overview"] .mm-muscle[data-level="high"]{fill:#ed5964;fill-opacity:.43;stroke:#ed5964;stroke-opacity:.33;stroke-width:1.5}',
  '.mm-hybrid[data-mode="atlas"][data-view="focused"] .mm-muscle[data-selected="false"]{fill:transparent;fill-opacity:0;stroke:transparent;stroke-opacity:0}',
  '.mm-hybrid[data-mode="atlas"][data-view="focused"] .mm-muscle[data-selected="true"]{fill:#45d6e7;fill-opacity:.36;stroke:#eaffff;stroke-opacity:1;stroke-width:4}',
  '.mm-hybrid[data-mode="atlas"] .mm-muscle:focus-visible{fill:#45d6e7;fill-opacity:.36;stroke:#fff;stroke-opacity:1;stroke-width:5;outline:none}',
  '@media(hover:hover) and (pointer:fine){.mm-hybrid[data-mode="atlas"] .mm-muscle:hover{stroke:#ecffff;stroke-opacity:1;stroke-width:3.5}}',
  '.mm-hybrid[data-mode="summary"] .mm-muscle{pointer-events:none;cursor:default}',
  '.mm-hybrid[data-mode="summary"] .mm-muscle[data-summary="main"]{fill:#f52f35;fill-opacity:.41;stroke:#ff989d;stroke-opacity:.5;stroke-width:1.6}',
  '.mm-hybrid[data-mode="summary"] .mm-muscle[data-summary="secondary"]{fill:#f6c13d;fill-opacity:.37;stroke:#ffe1a0;stroke-opacity:.43;stroke-width:1.6}',
  '.mm-hybrid .mm-muscle{mix-blend-mode:color}',
  '.mm-hybrid .anatomy-caption{font:700 25px Arial,sans-serif;letter-spacing:3px;fill:#c6dce7;text-anchor:middle}',
  '@media(prefers-reduced-motion:reduce){.mm-hybrid .mm-muscle{transition:none}}'
 ].join('\n');
 let renderSerial=0;

 function normalizedScore(item){
  const value=Number(item&&item.score);
  return Number.isFinite(value)?Math.max(0,Math.min(100,Math.round(value))):0;
 }
 function level(score){
  return score>=65?'high':score>=35?'medium':score>0?'low':'none';
 }
 function buildFigure(view,mode,model,selected,roles,serial){
  const diagram=assets.diagrams[view];
  const offset=view==='front'?0:FIGURE_WIDTH+GAP;
  const clipId='mm-body-'+serial+'-'+view;
  const photo=assets.photos[view];
  const byName=new Map((Array.isArray(model)?model:[]).filter(item=>item&&item.name).map(item=>[item.name,item]));
  const parts=diagram.muscles.map((part,index)=>{
   const muscle=GROUP_NAMES[part.group];
   const id='mm-'+view+'-'+part.id+'-'+index;
   const chosen=selected===muscle;
   const item=byName.get(muscle);
   const score=normalizedScore(item);
   const roleScore=Number(roles&&roles[muscle]);
   const summary=Number.isFinite(roleScore)&&roleScore>0?(roleScore>=.8?'main':'secondary'):'none';
   const desc=esc(muscle+', '+score+' na 100');
   return '<path id="'+esc(id)+'" class="mm-muscle muscle-region" d="'+esc(part.d)+'" data-muscle="'+esc(muscle)+'" data-level="'+level(score)+'" data-selected="'+String(chosen)+'" data-summary="'+summary+'"'+
    (mode==='atlas'?' role="button" tabindex="0" aria-pressed="'+String(chosen)+'" aria-label="'+desc+'"':'')+
    '><title>'+esc(muscle)+'</title></path>';
  }).join('');
  return '<g class="mm-figure" transform="translate('+offset+' 0)">'+
   '<defs><clipPath id="'+clipId+'" clipPathUnits="userSpaceOnUse"><path d="'+esc(diagram.outline)+'"/></clipPath></defs>'+
   '<image class="mm-photo" x="0" y="0" width="'+FIGURE_WIDTH+'" height="'+FIGURE_HEIGHT+'" preserveAspectRatio="none" clip-path="url(#'+clipId+')" href="'+photo+'" aria-hidden="true"/>'+
   '<g class="mm-masks">'+parts+'</g></g>';
 }
 function draw(mode,model,selected,roles,width){
  const active=typeof selected==='string'&&Array.isArray(model)&&model.some(item=>item.name===selected);
  const serial=++renderSerial;
  const w=Number(width);
  const scaled=Number.isFinite(w)&&w>0?Math.round(w):WIDTH;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+WIDTH+' '+HEIGHT+'" width="'+scaled+'" height="'+Math.round(scaled*HEIGHT/WIDTH)+'"'+
   ' class="ma-svg mm-hybrid" data-mode="'+mode+'" data-view="'+(active?'focused':'overview')+'" role="'+(mode==='atlas'?'group':'img')+'" aria-label="Anatomiczny atlas mięśni — przód i tył">'+
   '<style>'+STYLE+'</style>'+
   buildFigure('front',mode,model,selected,roles,serial)+
   buildFigure('back',mode,model,selected,roles,serial)+
   '<rect x="0" y="1536" width="'+WIDTH+'" height="79" fill="#09131c"/>'+
   '<text class="anatomy-caption" x="512" y="1585">PRZÓD</text>'+
   '<text class="anatomy-caption" x="1624" y="1585">TYŁ</text></svg>';
 }
 function renderAtlas(model,selected=null){return draw('atlas',model,selected,null,WIDTH);}
 function renderSession(roles,width=700){return draw('summary',[],null,roles,width);}
 async function drawSession(ctx,roles,x,y,width){
  if(!ctx||typeof ctx.drawImage!=='function')throw new TypeError('Canvas context required');
  if(!Number.isFinite(Number(width))||Number(width)<=0)throw new RangeError('Positive width required');
  if(typeof Image==='undefined')throw new Error('Browser image API unavailable');
  const svg=renderSession(roles,width);
  const img=new Image();
  await new Promise((resolve,reject)=>{
   img.onload=resolve;
   img.onerror=()=>reject(new Error('MuscleMap photoreal SVG could not be rendered for PNG export'));
   img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  });
  ctx.drawImage(img,x,y,width,width*HEIGHT/WIDTH);
 }
 return Object.freeze({REGIONS,renderAtlas,renderSession,drawSession,aspectRatio:HEIGHT/WIDTH,source:assets.source});
});
