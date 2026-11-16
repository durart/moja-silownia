/* Uniwersalny importer planów v1.5.0 — przetwarzanie dokumentu w przeglądarce. */
let importedDraft=[];
const impNorm=s=>String(s||'').toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
function impNotice(msg){document.getElementById('importStatus').textContent=msg}
function impScript(url,globalName){return new Promise((resolve,reject)=>{if(window[globalName])return resolve(window[globalName]);let s=document.createElement('script');s.src=url;s.onload=()=>resolve(window[globalName]);s.onerror=()=>reject(Error('Nie udało się pobrać biblioteki odczytu dokumentów. Sprawdź internet.'));document.head.appendChild(s)})}
async function impRead(file){
 let ext=file.name.split('.').pop().toLowerCase();
 if(ext==='pdf'){
  const pdfjs=await impScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','pdfjsLib');
  pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  let doc=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise,lines=[];
  for(let p=1;p<=doc.numPages;p++){
   const page=await doc.getPage(p),items=(await page.getTextContent()).items.filter(x=>x.str&&x.str.trim());
   let rows=[];
   for(const x of items){let y=Math.round(x.transform[5]/4)*4,row=rows.find(r=>Math.abs(r.y-y)<=3);if(!row){row={y,items:[]};rows.push(row)}row.items.push({x:x.transform[4],str:x.str})}
   rows.sort((a,b)=>b.y-a.y);
   for(const row of rows)lines.push(row.items.sort((a,b)=>a.x-b.x).map(x=>x.str).join('  '));
   lines.push('');
  }
  return lines.join('\n');
 }
 if(ext==='docx'){
  const mammoth=await impScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.9.0/mammoth.browser.min.js','mammoth');
  const out=await mammoth.convertToHtml({arrayBuffer:await file.arrayBuffer()});
  const el=document.createElement('div');el.innerHTML=out.value;
  el.querySelectorAll('tr').forEach(tr=>{let cells=[...tr.querySelectorAll('th,td')].map(c=>c.textContent.trim());tr.replaceWith(document.createTextNode('\n'+cells.join('  |  ')+'\n'))});
  el.querySelectorAll('p,h1,h2,h3,h4,li').forEach(n=>n.append(document.createTextNode('\n')));
  return el.textContent;
 }
 if(ext==='txt')return file.text();
 throw Error('Obsługiwane formaty: PDF, DOCX i TXT. Stary DOC zapisz jako DOCX.');
}
function impExerciseMatch(name){
 let n=impNorm(name),best=null,score=0;
 for(const e of state.exercises){
  let en=impNorm(e.name);
  if(n===en)return {id:e.id,score:1};
  let a=new Set(n.split(' ').filter(x=>x.length>2)),b=new Set(en.split(' ').filter(x=>x.length>2));
  let overlap=[...a].filter(x=>b.has(x)).length;
  let v=overlap/Math.max(a.size,b.size,1);
  if(v>score){score=v;best=e.id}
 }
 return {id:score>=.76?best:'',score};
}
function impParse(text,filename){
 let plans=[],current={name:'Plan 1',rows:[]};
 function push(){if(current.rows.length)plans.push(current)}
 let raw=text.replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean);
 for(let line of raw){
  let heading=line.match(/^(?:dzie[nń]\s*\d+|trening\s*[a-z0-9]+|dzie[nń]\s*[a-z]+|plan\s*[a-z0-9]+|push|pull|legs|fbw\s*(?:[a-z0-9]+)?|g[oó]ra\s*cia[lł]a|d[oó][lł]\s*cia[lł]a)\s*[:—–-]?\s*$/i);
  if(heading){push();current={name:line.replace(/[:—–-]$/,'').trim(),rows:[]};continue}
  if(/^(?:ćwiczeni[ea]|serie|powt[oó]rzenia|ci[eę][zż]ar|przerwa|tempo|uwagi|rpe|rir|lp\.?|nr)\b/i.test(line)&&line.length<95)continue;
  let clean=line.replace(/^\s*(?:\d{1,2}[.)]\s*|[-•]\s*)/,'').trim();
  if(clean.length<5||clean.length>180||/^(?:https?:|www\.|strona\s+\d|autor:|copyright)/i.test(clean))continue;
  let cells=clean.split(/\s*\|\s*|\t+|\s{2,}/).map(x=>x.trim()).filter(Boolean);
  let name=cells[0],params=cells.slice(1).join(' ');
  // Układy "3 x 12", "3x12", "12/10/8", "4 serie", "60 kg".
  if(cells.length===1){
   const m=clean.match(/^(.*?)(?:\s+[-–—:]?\s+)(\d{1,2}\s*[x×]\s*\d{1,3}(?:\s*[-/]\s*\d{1,3})*|\d{1,3}\s*\/\s*\d{1,3}(?:\s*\/\s*\d{1,3})*|\d{1,2}\s*ser(?:ie|ii))\b(.*)$/i);
   if(m){name=m[1].trim();params=m[2]+' '+m[3]}
  }
  name=name.replace(/^\d+[.)]\s*/,'').trim();
  if(!/[a-ząćęłńóśźż]{3}/i.test(name)||name.length>95)continue;
  let match=impExerciseMatch(name),hasNumbers=/\d/.test(params);
  // Odrzucenie akapitów opisowych bez parametrów i bez podobieństwa do katalogu.
  if(!hasNumbers&&match.score<.4)continue;
  let sr=params.match(/(\d{1,2})\s*[x×]\s*(\d{1,3}(?:\s*[/,-]\s*\d{1,3})*)/i);
  let series=sr?Number(sr[1]):Number(params.match(/(\d{1,2})\s*ser(?:ie|ii)/i)?.[1]||0);
  let reps=sr?sr[2]:params.match(/\b\d{1,3}(?:\s*\/\s*\d{1,3}){1,6}\b/)?.[0]||'';
  if(!series&&reps.includes('/'))series=reps.split('/').length;
  if(!series){let c=cells.find(x=>/^[2-6]$/.test(x));if(c)series=Number(c)}
  if(!reps){let nums=cells.filter(x=>/^\d{1,3}$/.test(x));if(nums.length>1)reps=nums.slice(1).join('/')}
  let weight=params.match(/(\d+(?:[,.]\d+)?)\s*kg/i)?.[1]||'';
  let rir=params.match(/\bRIR\s*[:=]?\s*(\d+)/i)?.[1]||'';
  let rest=params.match(/(\d{2,3})\s*(?:s|sek)\b/i)?.[1]||'';
  current.rows.push({name,series:series||'',reps,weight,rir,rest,notes:params,matchId:match.id,confidence:match.score,action:match.id?'existing':'new',group:'Inne'});
 }
 push();
 if(!plans.length)throw Error('Nie wykryto ćwiczeń. Spróbuj pliku z tekstem lub wklej treść planu do pola poniżej.');
 if(plans.length===1&&plans[0].name==='Plan 1')plans[0].name=filename.replace(/\.[^.]+$/,'');
 return plans;
}
function impRender(){
 const host=document.getElementById('importPreview');
 if(!importedDraft.length){host.innerHTML='';return}
 host.innerHTML=importedDraft.map((p,pi)=>'<div class="imp-plan"><label>Nazwa planu<input value="'+safe(p.name)+'" oninput="importedDraft['+pi+'].name=this.value"></label><div class="muted">'+p.rows.length+' pozycji — sprawdź dopasowania przed zapisaniem</div>'+p.rows.map((r,ri)=>{
 const opts='<option value="new" '+(r.action==='new'?'selected':'')+'>＋ Dodaj jako nowe ćwiczenie</option><option value="skip">Pomiń</option>'+sortExercisesByUse(state.exercises).map(e=>'<option value="'+safe(e.id)+'" '+(r.action==='existing'&&r.matchId===e.id?'selected':'')+'>'+safe(e.name)+'</option>').join('');
 return '<div class="imp-row"><label>Ćwiczenie z dokumentu<input value="'+safe(r.name)+'" oninput="importedDraft['+pi+'].rows['+ri+'].name=this.value"></label><label>Dopasowanie <select onchange="impSetMatch('+pi+','+ri+',this.value)">'+opts+'</select></label><div class="imp-fields"><label>Serie<input type="number" min="1" max="20" value="'+safe(r.series)+'" oninput="importedDraft['+pi+'].rows['+ri+'].series=this.value"></label><label>Powt.<input value="'+safe(r.reps)+'" oninput="importedDraft['+pi+'].rows['+ri+'].reps=this.value"></label><label>Kg<input value="'+safe(r.weight)+'" oninput="importedDraft['+pi+'].rows['+ri+'].weight=this.value"></label><label>RIR<input value="'+safe(r.rir)+'" oninput="importedDraft['+pi+'].rows['+ri+'].rir=this.value"></label></div><label>Uwagi / przerwa<input value="'+safe(r.notes)+'" oninput="importedDraft['+pi+'].rows['+ri+'].notes=this.value"></label></div>'
 }).join('')+'</div>').join('')+'<button onclick="impSave()">✓ Zatwierdź i zapisz plany</button><button class="secondary" onclick="importedDraft=[];impRender()">Anuluj import</button>';
}
function impSetMatch(pi,ri,v){let r=importedDraft[pi].rows[ri];r.action=v==='skip'?'skip':v==='new'?'new':'existing';r.matchId=v==='skip'||v==='new'?'':v}
async function impLoad(){
 const file=document.getElementById('importFile').files[0];if(!file)return;
 try{impNotice('Odczytuję '+file.name+'…');const text=await impRead(file);document.getElementById('importText').value=text;importedDraft=impParse(text,file.name);impRender();impNotice('Wykryto '+importedDraft.length+' planów. Sprawdź wszystkie ćwiczenia.')}catch(e){impNotice('Błąd: '+e.message)}
}
function impFromText(){
 try{importedDraft=impParse(document.getElementById('importText').value,'Plan z tekstu');impRender();impNotice('Sprawdź dopasowanie i parametry ćwiczeń.')}catch(e){impNotice('Błąd: '+e.message)}
}
function impSave(){
 if(!importedDraft.length)return;
 if(!confirm('Zapisać '+importedDraft.length+' planów? Nowe ćwiczenia zostaną dodane do katalogu.'))return;
 let count=0,newCount=0;
 for(const p of importedDraft){
  let ids=[],targets=[];
  for(const r of p.rows){
   if(r.action==='skip')continue;
   let id=r.matchId;
   if(r.action==='new'){
    const exact=state.exercises.find(e=>impNorm(e.name)===impNorm(r.name));
    if(exact)id=exact.id;
    else {id='import-'+Date.now()+'-'+Math.random().toString(36).slice(2,9);state.exercises.push({id,name:r.name,group:r.group||'Inne',equipment:'Inne'});newCount++}
   }
   if(!id)continue;
   ids.push(id);targets.push({exerciseId:id,sets:Number(r.series)||null,reps:String(r.reps||''),weight:String(r.weight||''),rir:String(r.rir||''),rest:String(r.rest||''),notes:String(r.notes||'')});
  }
  if(ids.length){state.plans.push({id:Date.now()+count+1,name:p.name||'Importowany plan',exerciseIds:ids,targets,importedAt:new Date().toISOString()});count++}
 }
 save();importedDraft=[];impRender();render();impNotice('Zapisano '+count+' planów i '+newCount+' nowych ćwiczeń. Parametry docelowe zachowano w danych planu.');
}
