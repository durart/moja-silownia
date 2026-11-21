/* Shared exercise categories and tile rendering. No storage writes. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ExerciseCatalog=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const categories=Object.freeze([
 {id:'Klatka piersiowa',label:'Klatka',art:0},
 {id:'Plecy',label:'Plecy',art:1},
 {id:'Barki',label:'Barki',art:2},
 {id:'Triceps',label:'Triceps',art:3},
 {id:'Biceps',label:'Biceps',art:4},
 {id:'Przedramiona',label:'Przedramię',art:5},
 {id:'Nogi',label:'Uda i pośladki',art:6},
 {id:'Brzuch',label:'Brzuch',art:7},
 {id:'Łydki',label:'Łydka',art:8},
 {id:'Kalistenika',label:'Kalistenika',art:9},
 {id:'__all__',label:'Całe ciało',art:10},
 {id:'__cardio__',label:'Kardio',art:11}
].map(x=>Object.freeze(x)));
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function matches(exercise,id){if(id==='__all__')return true;if(id==='__cardio__')return exercise?.group==='Kardio';return exercise?.group===id;}
function count(exercises,id){return (Array.isArray(exercises)?exercises:[]).filter(e=>matches(e,id)).length;}
function tiles(exercises,{surface='picker',selected=null,includeAll=false}={}){
 const catalog=surface==='atlas',tileClass=catalog?'muscle-tile':'pick-tile',imageClass=catalog?'catalog-source-art catalog-source-':'pick-source-image pick-source-',action=catalog?'selectMuscle':'pickerChoose';
 const items=categories.map(c=>{
  const selectedClass=catalog&&selected===c.id?' selected':'';
  const attrs=catalog?'onclick="'+action+'(this.dataset.category)"':'data-pick-group="'+escape(c.id)+'" onclick="'+action+'(this.dataset.pickGroup)"';
  const extra=catalog?' data-category="'+escape(c.id)+'"':'';
  const art='<span class="'+imageClass+c.art+'" aria-hidden="true"></span>';
  const title=catalog?'<span>'+escape(c.label)+'</span>':'<strong>'+escape(c.label)+'</strong>';
  return '<button type="button" class="'+tileClass+selectedClass+'"'+extra+' '+attrs+'>'+art+title+'<small>'+count(exercises,c.id)+' ćw.</small></button>';
 });
 if(includeAll){items.push('<button type="button" class="muscle-tile all'+(!selected?' selected':'')+'" onclick="selectMuscle(\'\')"><span class="catalog-source-art catalog-source-10" aria-hidden="true"></span><span>Wszystkie</span><small>'+(Array.isArray(exercises)?exercises.length:0)+' ćw.</small></button>');}
 return items.join('');
}
return Object.freeze({categories,matches,count,tiles});
});
