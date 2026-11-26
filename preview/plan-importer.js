/* Uniwersalny importer planów v1.5.0 — przetwarzanie dokumentu w przeglądarce. */
let importedDraft=[];
const impNorm=s=>String(s||'').toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
function impNotice(msg){document.getElementById('importStatus').textContent=msg}
function impScript(url,globalName){return new Promise((resolve,reject)=>{if(window[globalName])return resolve(window[globalName]);let s=document.createElement('script');s.src=url;s.onload=()=>resolve(window[globalName]);s.onerror=()=>reject(Error('Nie udało się pobrać biblioteki odczytu dokumentów. Sprawdź internet.'));document.head.appendChild(s)})}
const PDF_LIBRARY_BASE='./vendor/pdfjs';
function impLoadPdfLibrary(){return import(PDF_LIBRARY_BASE+'/pdf.min.mjs');}
// Reject oversized or unsupported ZIP containers before DOCX decompression.
function impCheckDocxArchive(buffer){
 const view=new DataView(buffer),length=view.byteLength;
 const invalid=()=>{throw Error('Nieprawidłowe lub zbyt duże archiwum DOCX.');};
 if(length<22)invalid();
 let end=-1;
 for(let i=length-22;i>=Math.max(0,length-65557);i--){
  if(view.getUint32(i,true)===0x06054b50&&i+22+view.getUint16(i+20,true)===length){end=i;break;}
 }
 if(end<0)invalid();
 const count=view.getUint16(end+10,true),size=view.getUint32(end+12,true),start=view.getUint32(end+16,true);
 if(view.getUint16(end+4,true)||view.getUint16(end+6,true)||view.getUint16(end+8,true)!==count||count>2048||start+size!==end)invalid();
 let pos=start,total=0;
 for(let i=0;i<count;i++){
  if(pos+46>end||view.getUint32(pos,true)!==0x02014b50)invalid();
  const flags=view.getUint16(pos+8,true),method=view.getUint16(pos+10,true),compressed=view.getUint32(pos+20,true),expanded=view.getUint32(pos+24,true);
  total+=expanded;
  if((flags&1)||![0,8].includes(method)||compressed>length||expanded>16*1024*1024||total>32*1024*1024)invalid();
  pos+=46+view.getUint16(pos+28,true)+view.getUint16(pos+30,true)+view.getUint16(pos+32,true);
  if(pos>end)invalid();
 }
 if(pos!==end)invalid();
}
async function impRead(file){
 let ext=file.name.split('.').pop().toLowerCase();
 const maxBytes=ext==='txt'?1024*1024:10*1024*1024;
 if(file.size>maxBytes)throw Error('Plik przekracza dopuszczalny rozmiar.');
 if(ext==='pdf'){
  const pdfjs=await impLoadPdfLibrary();
  pdfjs.GlobalWorkerOptions.workerSrc=PDF_LIBRARY_BASE+'/pdf.worker.min.mjs';
  let doc=await pdfjs.getDocument({data:await file.arrayBuffer(),isEvalSupported:false,enableScripting:false}).promise,lines=[];
  if(doc.numPages>100){await doc.destroy();throw Error('Dokument PDF przekracza limit 100 stron.');}
  for(let p=1;p<=doc.numPages;p++){
   const page=await doc.getPage(p),viewport=page.getViewport({scale:1});
   const items=(await page.getTextContent()).items.filter(x=>x.str&&x.str.trim()).map(x=>({str:x.str.trim(),x:x.transform[4],y:viewport.height-x.transform[5]}));
   const headings=items.filter(x=>/^(?:TRENING\s*(?:NR\.?\s*)?[1-9]\d*|TRENING BRZUCHA|DAY\s*[1-9]\d*|PLAN\s*[ABC])$/i.test(x.str)).sort((a,b)=>a.y-b.y);
   const headers=items.filter(x=>/^(?:SERIE|SERIES|SETS)$/i.test(x.str)).sort((a,b)=>a.y-b.y);
   for(let hi=0;hi<headings.length;hi++){
    const h=headings[hi],end=headings[hi+1]?.y??viewport.height;
    const head=headers.find(x=>x.y>h.y&&x.y<Math.min(end,h.y+125));
    if(!head)continue;
    const repHeader=items.find(x=>/^(?:POWT[ÓO]RZENIA|REPS)$/i.test(x.str)&&Math.abs(x.y-head.y)<18);
    const seriesX=head.x,repX=repHeader?.x??seriesX+65;
    lines.push(h.str);
    const anchors=items.filter(x=>x.y>head.y+14&&x.y<end&&x.x<viewport.width*.15&&/^\d{1,2}$/.test(x.str)).sort((a,b)=>a.y-b.y);
    for(let ai=0;ai<anchors.length;ai++){
     const anchor=anchors[ai],next=anchors[ai+1]?.y??Math.min(end,anchor.y+55);
     const maxY=Math.min(next-9,anchor.y+22),minY=anchor.y-16;
     const row=items.filter(x=>x.y>=minY&&x.y<=maxY&&x!==anchor);
     const name=row.filter(x=>x.x>viewport.width*.11&&x.x<seriesX-12).sort((a,b)=>a.y-b.y||a.x-b.x).map(x=>x.str).join(' ').trim();
     const sn=row.filter(x=>Math.abs(x.x-seriesX)<25&&/^\d{1,2}$/.test(x.str)).sort((a,b)=>Math.abs(a.y-anchor.y)-Math.abs(b.y-anchor.y))[0];
     const rp=row.filter(x=>x.x>=repX-20&&/\d/.test(x.str)).sort((a,b)=>Math.abs(a.y-anchor.y)-Math.abs(b.y-anchor.y))[0];
     if(name&&sn&&rp)lines.push(name+' | '+sn.str+' | '+rp.str);
    }
   }
  }
  return lines.join('\n');
 }
 if(ext==='docx'){
  const arrayBuffer=await file.arrayBuffer();
  impCheckDocxArchive(arrayBuffer);
  const mammoth=await impScript('./vendor/mammoth/mammoth.browser.min.js','mammoth');
  const out=await mammoth.convertToHtml({arrayBuffer},{externalFileAccess:false});
  const template=document.createElement('template');template.innerHTML=out.value;
  const el=template.content;
  el.querySelectorAll('script,style,iframe,object,embed,link,meta,svg,math').forEach(node=>node.remove());
  el.querySelectorAll('tr').forEach(tr=>{let cells=[...tr.querySelectorAll('th,td')].map(c=>c.textContent.trim());tr.replaceWith(document.createTextNode('\n'+cells.join('  |  ')+'\n'))});
  el.querySelectorAll('p,h1,h2,h3,h4,li').forEach(n=>n.append(document.createTextNode('\n')));
  return el.textContent;
 }
 if(ext==='txt')return file.text();
 throw Error('Obsługiwane formaty: PDF, DOCX i TXT. Stary DOC zapisz jako DOCX.');
}
function impExerciseMatch(name){
 let n=impNorm(name),best=null,score=0;
 const aliases={"wyciskanie nogami maszyna":"Wyciskanie nogami","wyciskanie na klatke maszyna":"Wyciskanie na maszynie","prostowanie nog maszyna":"Prostowanie nóg siedząc","wyciskanie nad glowe siedzac maszyna":"Wyciskanie barków na maszynie","prostowanie ramion na wyciagu gornym z lina":"Prostowanie ramion na wyciągu z liną"};
 const alias=aliases[n];if(alias){const e=state.exercises.find(x=>impNorm(x.name)===impNorm(alias));if(e)return {id:e.id,score:1}}
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

// CSV: przecinki oraz pola w cudzysłowach, również z przecinkami w wskazówkach.
// Obsługa tabeli: Kolejność, Ćwiczenie, Serie × Powtórzenia, Wskazówki techniczne.
function impCSVRead(text){
 const rows=[];let row=[],cell='',quoted=false;
 const input=String(text||'').replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
 for(let i=0;i<input.length;i++){
  const ch=input[i];
  if(ch==='"'){if(quoted&&input[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
  else if(ch===','&&!quoted){row.push(cell.trim());cell=''}
  else if(ch==='\n'&&!quoted){row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell=''}
  else cell+=ch;
 }
 row.push(cell.trim());if(row.some(Boolean))rows.push(row);
 return rows;
}
function impParseCSV(text,filename){
 const rows=impCSVRead(text);
 const first=rows[0]||[];
 const header=first.map(impNorm);
 const exerciseColumn=header.findIndex(s=>/cwiczen/.test(s));
 const seriesColumn=header.findIndex(s=>/serie|powtorzen/.test(s));
 const looksLikeCSV=first.length>=3&&exerciseColumn>=0&&seriesColumn>=0;
 if(!looksLikeCSV)return null;
 const indexColumn=header.findIndex(s=>/kolejnosc|^lp$|numer/.test(s));
 const notesColumn=header.findIndex(s=>/wskazow|uwagi|technicz|notat/.test(s));
 const plan={name:filename.replace(/\.[^.]+$/,'')||'Plan z tekstu',rows:[]};
 for(const cells of rows.slice(1)){
  let name=String(cells[exerciseColumn]||'').replace(/^\s*\d{1,3}[.)]\s*/,'').trim();
  if(!name||!/[a-ząćęłńóśźż]{3}/i.test(name))continue;
  const parameter=String(cells[seriesColumn]||'').trim();
  const sr=parameter.match(/(\d{1,2})\s*[x×*]\s*(\d{1,3}(?:\s*[-–/,]\s*\d{1,3})*)/i);
  const series=sr?Number(sr[1]):Number(parameter.match(/(\d{1,2})\s*ser/i)?.[1]||0);
  const reps=sr?sr[2].replace(/\s*[–]\s*/g,'-').replace(/\s+/g,''):parameter.match(/\d{1,3}(?:\s*[-/,]\s*\d{1,3})*/)?.[0]||'';
  const notes=notesColumn>=0?String(cells[notesColumn]||'').trim():'';
  const match=impExerciseMatch(name);
  plan.rows.push({name,series:series||'',reps,weight:'',rir:'',rest:'',notes,
   matchId:match.id,confidence:match.score,action:match.id?'existing':'new',group:'Inne'});
 }
 if(!plan.rows.length)throw Error('CSV zawiera nagłówki, ale nie wykryto pozycji ćwiczeń.');
 return [plan];
}

function impParseSetBlocks(text,filename){
 const lines=String(text||'').replace(/\r\n?/g,'\n').split('\n').map(x=>x.trim()).filter(Boolean);
 const head=/^(?:trening(?:\s+siłowy)?|plan)\s+(?:nr\.?\s*)?(?:[a-z]|\d{1,2})(?:\s*[-–:].*)?$/i;
 const qty=/^(\d{1,2})\s*ser(?:ie|ii|ia|ię)?$/i;
 const set=/^(\d+(?:[,.]\d+)?)\s*kg\s*[x×*]\s*(\d{1,3}(?:\s*[-–—]\s*\d{1,3})?)\s*(?:powt\.?)?$/i;
 let plan={name:(filename||'Plan z tekstu').replace(/\.[^.]+$/,''),rows:[]},plans=[],pending=null,found=0;
 function finish(){
  if(!plan.rows.length)return;
  for(const row of plan.rows){
   const n=Math.max(Number(row.series)||0,row.setDetails.length);
   row.series=n;
   while(row.setDetails.length<n)row.setDetails.push({weight:'',reps:''});
   row.weight=row.setDetails[0]?.weight||'';
   row.reps=row.setDetails.map(v=>v.reps).join('/');
  }
  plans.push(plan);
 }
 for(let i=0;i<lines.length;i++){
  const line=lines[i];
  if(head.test(line)){finish();plan={name:line,rows:[]};pending=null;continue}
  const n=line.match(qty);
  if(n&&pending){pending.series=Number(n[1]);continue}
  const v=line.match(set);
  if(v&&pending){pending.setDetails.push({weight:v[1].replace(',','.'),reps:v[2].replace(/\s*[-–—]\s*/g,'-')});found++;continue}
  if(qty.test(lines[i+1]||'')&&line.length>=4&&line.length<=100&&/[a-ząćęłńóśźż]{3}/i.test(line)){
   const m=impExerciseMatch(line);
   pending={name:line,series:0,reps:'',weight:'',rir:'',rest:'',notes:'',setDetails:[],matchId:m.id,confidence:m.score,action:m.id?'existing':'new',group:'Inne'};
   plan.rows.push(pending);
  }else pending=null;
 }
 finish();
 return found&&plans.length?plans:null;
}

function impValidatePlans(plans){
 if(plans.length>50||plans.some(plan=>plan.rows.length>100))throw Error('Przekroczono limit 50 planów lub 100 ćwiczeń w planie.');
 return plans;
}
function impParse(text,filename){
 if(typeof text!=='string'||text.length>1024*1024)throw Error('Tekst przekracza dopuszczalny rozmiar.');
 const csvPlans=impParseCSV(text,filename);
 if(csvPlans)return impValidatePlans(csvPlans);
 const detailed=impParseSetBlocks(text,filename);if(detailed)return impValidatePlans(detailed);
 let plans=[],current={name:'Plan 1',rows:[]};
 const flush=()=>{if(current.rows.length)plans.push(current)};
 const raw=text.replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean);
 let pending=null;
 for(let line of raw){
  let heading=line.match(/^(?:TRENING BRZUCHA|(?:(?:dzie[nń]|day|trening|training|plan|fbw)\s*(?:nr\.?|no\.?|#)?\s*([1-9]\d*|[ABC])(?:\s*[-–—:]\s*.*)?|(?:push|pull|legs|upper|lower)(?:\s+day)?))$/i);
  if(heading){flush();current={name:line.trim(),rows:[]};pending=null;continue}
  if(/^(?:ćwiczeni[ea]|serie|powt[oó]rzenia|ci[eę][zż]ar|przerwa|tempo|uwagi|rpe|rir|lp\.?|nr)\b/i.test(line)&&line.length<100)continue;
  let clean=line.replace(/^\s*(?:\d{1,2}[.)]\s*|[-•]\s*)/,'').trim();
  if(clean.length<4||clean.length>190||/^(?:https?:|www\.|strona\s+\d|autor:|copyright)/i.test(clean))continue;
  let cells=clean.split(/\s*\|\s*|\t+|\s{2,}/).map(x=>x.trim()).filter(Boolean);
  let name=cells[0],params=cells.slice(1).join(' ');
  if(cells.length===1){
   let m=clean.match(/^(.*?)(?:\s+[-–—:]?\s+)(\d{1,2}\s*[x×]\s*\d{1,3}(?:\s*[-/]\s*\d{1,3})*|\d{1,3}\s*\/\s*\d{1,3}(?:\s*\/\s*\d{1,3})*|\d{1,2}\s*ser(?:ie|ii))\b(.*)$/i);
   if(m){name=m[1].trim();params=m[2]+' '+m[3]}
  }
  name=name.replace(/^\d+[.)]\s*/,'').trim();
  if(!/[a-ząćęłńóśźż]{3}/i.test(name)||name.length>95)continue;
  let match=impExerciseMatch(name),hasNumbers=/\d/.test(params);
  if(!hasNumbers&&match.score<.4)continue;
  let sr=params.match(/(\d{1,2})\s*[x×]\s*(\d{1,3}(?:\s*[/,-]\s*\d{1,3})*)/i);
  let series=sr?Number(sr[1]):Number(params.match(/(\d{1,2})\s*ser(?:ie|ii)/i)?.[1]||0);
  let reps=sr?sr[2]:params.match(/\b\d{1,3}(?:\s*[/,;-]\s*\d{1,3}){1,6}\b/)?.[0]||'';
  let numeric=cells.slice(1).filter(x=>/^\d{1,3}$/.test(x));
  if(!series&&numeric.length>=2){series=Number(numeric[0]);reps=numeric.slice(1).join('/')}
  if(!series&&cells.length>=3&&/^\d{1,2}$/.test(cells[1])){series=Number(cells[1]);reps=cells[2]}
  if(!series&&/[/,]/.test(reps))series=reps.split(/[/,]/).length;
  if(!series&&numeric.length===1&&Number(numeric[0])<=8)series=Number(numeric[0]);
  if(!reps&&series&&numeric.length>1)reps=numeric.slice(1).join('/');
  if(!reps&&series&&numeric.length===1&&Number(numeric[0])>8)reps=numeric[0];
  let weight=params.match(/(\d+(?:[,.]\d+)?)\s*kg/i)?.[1]||'';
  let rir=params.match(/\bRIR\s*[:=]?\s*(\d+)/i)?.[1]||'';
  let rest=params.match(/(\d{2,3})\s*(?:s|sek)\b/i)?.[1]||'';
  current.rows.push({name,series:series||'',reps,weight,rir,rest,notes:params,matchId:match.id,confidence:match.score,action:match.id?'existing':'new',group:'Inne'});
 }
 flush();
 if(!plans.length)throw Error('Nie wykryto ćwiczeń. Wklej tekst lub użyj PDF z warstwą tekstową.');
 if(plans.length===1&&plans[0].name==='Plan 1')plans[0].name=filename.replace(/\.[^.]+$/,'');
 return impValidatePlans(plans);
}
function impRender(){
 const host=document.getElementById('importPreview');
 if(!importedDraft.length){host.innerHTML='';return}
 host.innerHTML=importedDraft.map((p,pi)=>'<div class="imp-plan"><label>Nazwa planu<input value="'+safe(p.name)+'" oninput="importedDraft['+pi+'].name=this.value"></label><div class="muted">'+p.rows.length+' pozycji — sprawdź dopasowania przed zapisaniem</div>'+p.rows.map((r,ri)=>{
 const opts='<option value="new" '+(r.action==='new'?'selected':'')+'>＋ Dodaj jako nowe ćwiczenie</option><option value="skip">Pomiń</option>'+sortExercisesByUse(state.exercises).map(e=>'<option value="'+safe(e.id)+'" '+(r.action==='existing'&&r.matchId===e.id?'selected':'')+'>'+safe(e.name)+'</option>').join('');
 return '<div class="imp-row"><label>Ćwiczenie z dokumentu<input value="'+safe(r.name)+'" oninput="importedDraft['+pi+'].rows['+ri+'].name=this.value"></label><label>Dopasowanie <select onchange="impSetMatch('+pi+','+ri+',this.value)">'+opts+'</select></label><div class="imp-fields"><label>Serie<input type="number" min="1" max="20" value="'+safe(r.series)+'" oninput="importedDraft['+pi+'].rows['+ri+'].series=this.value"></label><label>Powt.<input value="'+safe(r.reps)+'" oninput="importedDraft['+pi+'].rows['+ri+'].reps=this.value"></label><label>Kg<input value="'+safe(r.weight)+'" oninput="importedDraft['+pi+'].rows['+ri+'].weight=this.value"></label><label>RIR<input value="'+safe(r.rir)+'" oninput="importedDraft['+pi+'].rows['+ri+'].rir=this.value"></label></div><label>Uwagi / przerwa<input value="'+safe(r.notes)+'" oninput="importedDraft['+pi+'].rows['+ri+'].notes=this.value"></label></div>'
 }).join('')+'</div>').join('')+'<button onclick="impSave()">✓ Zatwierdź i zapisz plany</button><button class="secondary" onclick="importedDraft=[];impRender()">Anuluj import</button>';
 impRenderSetFields();
}

/* Szczegóły serii importowanych z wielowierszowego planu */
function impUpdateSet(pi,ri,si,field,value){
 const row=importedDraft[pi]?.rows[ri];
 if(!row?.setDetails?.[si]||!['weight','reps'].includes(field))return;
 row.setDetails[si][field]=String(value);
 row.weight=row.setDetails[0]?.weight||'';
 row.reps=row.setDetails.map(x=>x.reps).join('/');
}
function impChangeSetCount(pi,ri,value){
 const row=importedDraft[pi]?.rows[ri];if(!row)return;
 const count=Math.max(1,Math.min(20,Math.floor(Number(value)||1)));
 row.series=count;
 while(row.setDetails.length<count)row.setDetails.push({weight:'',reps:''});
 row.setDetails.length=count;
 row.weight=row.setDetails[0]?.weight||'';
 row.reps=row.setDetails.map(x=>x.reps).join('/');
 impRender();
}
function impRenderSetFields(){
 const plans=[...document.querySelectorAll('#importPreview .imp-plan')];
 importedDraft.forEach((plan,pi)=>{
  const rows=[...(plans[pi]?.querySelectorAll('.imp-row')||[])];
  plan.rows.forEach((r,ri)=>{
   if(!r.setDetails?.length)return;
   const original=rows[ri]?.querySelector('.imp-fields');
   if(!original)return;
   const newFields='<div class="imp-set-details"><div class="imp-set-summary"><label>Serie<input type="number" min="1" max="20" value="'+safe(r.series)+'" onchange="impChangeSetCount('+pi+','+ri+',this.value)"></label><span>Ciężar i powtórzenia każdej serii</span></div>'+
    r.setDetails.map((x,si)=>'<div class="imp-set-line"><b>Seria '+(si+1)+'</b><label>Kg<input inputmode="decimal" value="'+safe(x.weight)+'" oninput="impUpdateSet('+pi+','+ri+','+si+',&#39;weight&#39;,this.value)"></label><label>Powt. (np. 8-10)<input value="'+safe(x.reps)+'" oninput="impUpdateSet('+pi+','+ri+','+si+',&#39;reps&#39;,this.value)"></label></div>').join('')+'</div>';
   original.outerHTML=newFields;
  });
 });
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
 const previousState=structuredClone(state);
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
   ids.push(id);targets.push({exerciseId:id,sets:Number(r.series)||null,reps:String(r.reps||''),weight:String(r.weight||''),setDetails:Array.isArray(r.setDetails)?r.setDetails.map(v=>({weight:String(v.weight||''),reps:String(v.reps||'')})):[],rir:String(r.rir||''),rest:String(r.rest||''),notes:String(r.notes||'')});
  }
  if(ids.length){state.plans.push({id:Date.now()+count+1,name:p.name||'Importowany plan',exerciseIds:ids,targets,importedAt:new Date().toISOString()});count++}
 }
 if(!save()){state=previousState;impNotice('Nie udało się zapisać planów. Poprzednie dane zostały zachowane.');return;}
 importedDraft=[];impRender();render();impNotice('Zapisano '+count+' planów i '+newCount+' nowych ćwiczeń. Parametry docelowe zachowano w danych planu.');
}
