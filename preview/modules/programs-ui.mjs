/* Program UI: uses the same atomic state save and backup as the training diary. */
import {createRestAudio} from './rest-audio.js?v=1';
const core=window.MojaCircuitCore;
const history=window.MojaProgramHistory;
const programs=window.MojaProgramsData;
const host=document.getElementById('programsContent');
const defaultState=()=>({version:1,progress:{},active:null});
const getState=()=>state.programTraining??defaultState();
const programFor=id=>programs.find(p=>p.id===id);
const dayFor=(p,day,revision=p?.scheduleRevision??1)=>history.definitionFor(p,day,revision);
const validInt=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
let selectedProgram=programs[0].id,selectedCount=1,failed=false,errorMessage='';
const audio=createRestAudio({getRestUntil:()=>getState().active?.run?.status==='rest'?getState().active.run.deadline:null,note,document,window,fetch});
function validate(v){
 if(v==null)return true;
 if(v.version!==1||!v.progress||typeof v.progress!=='object'||Array.isArray(v.progress)||Object.keys(v.progress).length>programs.length)throw Error('Nieprawidłowy zapis programu');
 for(const [id,p] of Object.entries(v.progress)){
  const def=programFor(id);
  if(!def||p?.version!==def.version||!validInt(p.nextDay,1,def.days.length+1)||!Array.isArray(p.completed)||p.completed.length!==p.nextDay-1)throw Error('Nieprawidłowy postęp programu');
  for(const [i,d] of p.completed.entries()){
   if(d?.day!==i+1||!validInt(d.finishedAt,0,Number.MAX_SAFE_INTEGER)||!validInt(d.blockCount,0,3)||!Array.isArray(d.records)||d.records.length>2000)throw Error('Nieprawidłowy dzień programu');
   const expected=dayFor(def,d.day,d.scheduleRevision??1);
   if(!expected)throw Error('Nieznana wersja dnia programu');
   if(expected.kind==='rest'){if(d.blockCount!==0||d.records.length)throw Error('Nieprawidłowy odpoczynek');continue;}
   if(d.blockCount===0)throw Error('Brak bloku');
   if(d.historyId!=null&&!validInt(d.historyId,0,Number.MAX_SAFE_INTEGER))throw Error('Nieprawidłowy identyfikator historii');
   if(d.startedAt!=null&&(!validInt(d.startedAt,0,d.finishedAt)))throw Error('Nieprawidłowy początek dnia');
   const steps=core.build(expected.blocks,d.blockCount,def.blockRest);
   const exercises=steps.map((s,i)=>s.kind==='exercise'?i:null).filter(i=>i!==null);
   if(d.records.length!==exercises.length||!d.records.every((r,j)=>r.position===exercises[j]&&validInt(r.actual,1,3600)&&validInt(r.completedAt,0,Number.MAX_SAFE_INTEGER)&&core.validAlternative(steps[r.position],r)))throw Error('Nieprawidłowe wyniki programu');
  }
 }
 if(v.active!=null){
  const a=v.active,p=programFor(a.programId),d=dayFor(p,a.day,a.scheduleRevision??1);
  if(!p||!d||d.kind==='rest'||v.progress[p.id]?.nextDay!==a.day||!validInt(a.blockCount,1,d.blocks.length)||!core.valid(a.run))throw Error('Nieprawidłowy aktywny program');
  const expected=core.build(d.blocks,a.blockCount,p.blockRest);
  if(JSON.stringify(expected)!==JSON.stringify(a.run.steps)||expected.some(x=>x.unresolved)||a.run.records.some(x=>!validInt(x.completedAt,0,Number.MAX_SAFE_INTEGER)))throw Error('Nieprawidłowy przebieg programu');
 }
 return true;
}
function enrich(session,day){
 if(Number.isFinite(day.bodyWeightKg)&&day.bodyWeightKg>0)session.bodyWeightKg=day.bodyWeightKg;
 if(session.durationSeconds!=null&&session.bodyWeightKg!=null)session.calories=estimateCalories(session);
 session.muscles=muscleLoads(session);session.fatigueImpulse=muscleFatigueImpulse(session);
 session.fatigueModel=session.sets.some(s=>s.measurementType==='duration')?3:2;
 return session;
}
function persist(next,withHistory=false){
 const previous=state.programTraining,previousSessions=state.sessions;
 try{
  validate(next);
  const result=withHistory?history.reconcile(next,state.sessions,programs,core,enrich):{programTraining:next,sessions:state.sessions,lastId:null,added:[]};
  state.programTraining=result.programTraining;state.sessions=result.sessions;
  if(!save())throw Error('Nie zapisano danych.');
  failed=false;errorMessage='';return result;
 }catch(e){if(previous===undefined)delete state.programTraining;else state.programTraining=previous;state.sessions=previousSessions;failed=true;errorMessage=e.message;audio.stop();return false;}
}
function syncHistory(){
 if(!state.programTraining)return false;
 try{
  const v=getState();validate(v);
  if(!Object.values(v.progress).some(p=>p.completed.some(d=>d.blockCount>0&&d.historyId==null)))return true;
  return !!persist(v,true);
 }catch(e){failed=true;errorMessage=e.message;return false;}
}
function active(){return !!state.programTraining?.active;}
function regularActive(){return !!(state.startedAt||state.activePlan||state.manualStarted||state.active?.length||state.pendingWorkout||window.MojaCardioWorkout?.hasRecords()||window.MojaCardioWorkout?.timer());}
function progress(v,p){return v.progress[p.id]??{version:p.version,nextDay:1,completed:[]};}
function startDay(p,day,count){
 if(active()||regularActive()){note('Najpierw zakończ aktywny trening.');return;}
 const v=getState(),pr=progress(v,p);
 if(day.day!==pr.nextDay||day.kind==='rest'||day.blocks.slice(0,count).some(b=>b.moves.some(m=>m.unresolved)))return;
 const run=core.create(core.build(day.blocks,count,p.blockRest),Date.now());
 persist({...v,progress:{...v.progress,[p.id]:pr},active:{programId:p.id,day:day.day,blockCount:count,scheduleRevision:p.scheduleRevision??1,bodyWeightKg:ProfileCore.resolveWorkoutWeight({},ProfileCore.isValidProfile(state.profile)?state.profile:null,state.bodyWeight),run}});
 render();
}
function completeDay(v,p,day,blockCount,records,finishedAt,startedAt,bodyWeightKg,scheduleRevision=p.scheduleRevision??1){
 const pr=progress(v,p);
 return {...v,active:null,progress:{...v.progress,[p.id]:{...pr,nextDay:day+1,completed:[...pr.completed,{day,blockCount,records,finishedAt,scheduleRevision,...(Number.isSafeInteger(startedAt)?{startedAt}:{}),...(Number.isFinite(bodyWeightKg)?{bodyWeightKg}:{})}]}}};
}
function completeRest(p,day){
 if(active()||regularActive())return;
 const v=getState();
 if(day.kind==='rest'&&progress(v,p).nextDay===day.day)persist(completeDay(v,p,day.day,0,[],Date.now()));
 render();
}
function transition(event){
 if(failed)return;
 const v=getState(),a=v.active;
 if(!a)return;
 try{
  validate(v);
  const old=a.run,next=core.act(old,event,Date.now());
  if(next===old)return;
  const p=programFor(a.programId);
  const result=next.status==='done'?completeDay(v,p,a.day,a.blockCount,next.records,next.finishedAt,next.startedAt,a.bodyWeightKg,a.scheduleRevision??1):{...v,active:{...a,run:next}};
  const saved=persist(result,next.status==='done');
  if(!saved){render();return;}
  if(old.status==='rest'&&next.status!=='rest'){if(event.type==='skipRest')audio.stop();else if(!audio.getScheduledUntil())audio.beep();}
  if(old.status==='running'&&next.status!=='running'&&next.status!=='paused')audio.beep();
  if(next.status==='rest'){audio.unlock();audio.schedule(next.deadline);}
  render();
  if(next.status==='done'&&saved.lastId!=null){if(!window.openSportSummary?.(saved.lastId))tab('history');}
 }catch(e){failed=true;errorMessage=e.message;render();}
}
function node(tag,textValue,cls){
 const el=document.createElement(tag);if(textValue!=null)el.textContent=String(textValue);if(cls)el.className=cls;return el;
}
function add(parent,tag,textValue,cls){const el=node(tag,textValue,cls);parent.append(el);return el;}
function button(parent,label,action,cls='secondary'){
 const b=add(parent,'button',label,cls);b.type='button';b.addEventListener('click',action);return b;
}
function fmt(seconds){return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');}
function target(m){return m.type==='duration'?m.target+' s'+(m.perSide?' / stronę':''):m.target+' powt.'+(m.perSide?' / stronę':'');}
function picture(parent,m){
 if(!m.id)return;
 const e=state.exercises.find(x=>x.id===m.id);
 if(!e)return;
 // Reuse trusted catalog art; no external image sources or imported HTML.
 const img=add(parent,'img',null,'program-exercise-art');
 const src=window.ExerciseGraphics?.exerciseGraphic(m.id);if(!src){img.remove();return;}img.src=src;img.alt=m.name;img.loading='lazy';
 img.addEventListener('error',()=>img.remove(),{once:true});
 button(parent,'Technika ćwiczenia',()=>openTechnique(m.id));
}
function renderOverview(parent,steps,records,position){
 const done=new Map(records.map(r=>[r.position,r]));
 const details=add(parent,'details',null,'program-week');details.open=true;
 add(details,'summary','Wszystkie ćwiczenia i wyniki');
 let block=null,round=null;
 for(const [i,base] of steps.entries()){
  if(base.kind!=='exercise')continue;
  const s=core.actualStep(base,done.get(i));
  if(block!==s.block||round!==s.round){block=s.block;round=s.round;add(details,'h4','Blok '+block+' · runda '+round);}
  const row=add(details,'p',null,'program-overview-row');
  add(row,'span',(done.has(i)?'✓ ':i===position?'→ ':'○ ')+s.name+(s.side?' · '+s.side:''));
  add(row,'strong',done.has(i)?history.resultLabel(s,done.get(i).actual):'Cel: '+target(s));
 }
}
function renderRun(v){
 const a=v.active,p=programFor(a.programId),day=dayFor(p,a.day,a.scheduleRevision??1),r=a.run,s=r.steps[r.position];
 add(host,'h2','Dzień '+day.day+' — '+day.title);
 add(host,'p','Blok '+s.block+' / '+a.blockCount+' · runda '+s.round+(s.rounds?' / '+s.rounds:''),'muted');
 const meter=add(host,'progress');meter.max=r.steps.length;meter.value=r.position;meter.setAttribute('aria-label','Postęp treningu');
 const card=add(host,'div',null,'card program-active');
 if(s.kind==='rest'){
  add(card,'h2',s.reason==='block'?'Przerwa między blokami':s.reason==='round'?'Przerwa między rundami':'Przerwa po ćwiczeniu');
  const out=add(card,'output',fmt(core.remaining(r,Date.now())),'program-clock');out.id='programClock';out.setAttribute('aria-label','Pozostały czas przerwy');
  const next=r.steps[r.position+1];if(next)add(card,'p','Następne: '+next.name,'muted');
  button(card,'Pomiń przerwę',()=>transition({type:'skipRest'}));
 }else{
  add(card,'h2',s.name+(s.side?' — '+s.side+' strona':''));
  add(card,'p','Cel: '+target(s));
  if(s.note)add(card,'p',s.note,'muted');
  if(!s.id)add(card,'p','Ćwiczenie bez powiązanej grafiki w katalogu.','muted');else picture(card,s);
  if(s.type==='duration'){
   const out=add(card,'output',fmt(core.remaining(r,Date.now())),'program-clock');out.id='programClock';out.setAttribute('aria-label','Pozostały czas ćwiczenia');
   if(r.status==='ready')button(card,'START',()=>{audio.unlock();transition({type:'start'});},'program-primary');
   if(r.status==='running')button(card,'Pauza',()=>transition({type:'pause'}));
   if(r.status==='paused')button(card,'Wznów',()=>{audio.unlock();transition({type:'resume'});},'program-primary');
   if(r.status==='paused'||r.status==='running')button(card,'Zakończ wcześniej',()=>transition({type:'finish'}));
  }
  if(r.status==='ready'){
   const label=add(card,'label',s.type==='duration'?'Wykonano (s)':'Wykonano '+(s.perSide?'na stronę':'powtórzeń'));
   const input=add(label,'input');input.type='number';input.inputMode='numeric';input.min='1';input.max='3600';input.step='1';input.value=String(s.target);
   let selectedAlternative=false;
   if(s.alternative){const optionLabel=add(card,'label','Wariant ćwiczenia');const select=add(optionLabel,'select');const standard=add(select,'option',s.name);standard.value='standard';const easier=add(select,'option',s.alternative.name);easier.value='alternative';select.addEventListener('change',()=>{selectedAlternative=select.value==='alternative';input.value=String(selectedAlternative?s.alternative.target:s.target);});button(card,'Technika wariantu',()=>openTechnique(s.alternative.id));}
   button(card,s.type==='duration'?'Zapisz czas ręcznie':'✓ Zatwierdź powtórzenia',()=>{const n=Number(input.value);if(!validInt(n,1,3600)){note('Podaj prawidłową liczbę.');return;}audio.unlock();transition({type:s.type==='duration'?'manual':'reps',actual:n,...(selectedAlternative?{alternative:true}:{})});},s.type==='reps'?'program-primary':'secondary');
  }
 }
 add(host,'p','Zapisane ćwiczenia: '+r.records.length,'muted');
 renderOverview(host,r.steps,r.records,r.position);
 button(host,'Przerwij dzień bez zaliczenia',()=>{if(confirm('Przerwać bieżący dzień? Zapisane wyniki tego dnia nie zostaną zaliczone.')){audio.stop();persist({...v,active:null});render();}},'danger');
}
function renderList(v){
 if(programs.length>1){
  const sel=add(host,'select');sel.setAttribute('aria-label','Program treningowy');
  for(const p of programs){const o=add(sel,'option',p.title);o.value=p.id;}
  sel.value=selectedProgram;sel.addEventListener('change',()=>{selectedProgram=sel.value;selectedCount=1;render();});
 }
 const p=programFor(selectedProgram)||programs[0],pr=progress(v,p),day=dayFor(p,pr.nextDay);
 add(host,'h2',p.title);add(host,'p',p.weeks.length+' tygodni · '+p.days.length+' dni');
 const meter=add(host,'progress');meter.max=p.days.length;meter.value=pr.completed.length;meter.setAttribute('aria-label','Postęp programu');
 add(host,'p',pr.completed.length+' / '+p.days.length+' dni ukończonych');
 if(day){
  const card=add(host,'div',null,'card');
  add(card,'h3','Dzień '+day.day+' — '+day.title);
  if(day.kind==='rest'){add(card,'p','Dzisiaj pełny odpoczynek. Nie ma treningu.');button(card,'Zalicz dzień odpoczynku',()=>completeRest(p,day),'program-primary').disabled=regularActive();}
  else{
   const label=add(card,'label','Zakres treningu (czas orientacyjny)');
   const sel=add(label,'select');
   ['15 min — główna misja','30 min — + blok 1','45 min — + blok 2'].slice(0,day.blocks.length).forEach((x,i)=>{const o=add(sel,'option',x);o.value=String(i+1);});
   selectedCount=Math.min(selectedCount,day.blocks.length);sel.value=String(selectedCount);
   sel.addEventListener('change',()=>{selectedCount=Number(sel.value);render();});
   for(const [i,b] of day.blocks.slice(0,selectedCount).entries()){
    const details=add(card,'details');details.open=i===0;add(details,'summary',(i===0?'Główna misja':'Blok bonusowy '+i)+' · '+b.rounds+' rund');
    if(b.rounds>1)add(details,'p','Przerwa po rundzie: '+b.rest+' s','muted');
    for(const m of b.moves)add(details,'p',m.name+' — '+target(m)+(m.note?' · '+m.note:'')+(m.unresolved?' · wymaga wyjaśnienia':''));
   }
   const unresolved=day.blocks.slice(0,selectedCount).flatMap(b=>b.moves).filter(m=>m.unresolved);
   if(unresolved.length)add(card,'p','Ten zakres zawiera niejednoznaczne pozycje ze źródła. Wybierz krótszy wariant do czasu ich wyjaśnienia.','program-warning');
   if(regularActive())add(card,'p','Najpierw zakończ zwykły trening.','program-warning');
   button(card,'Rozpocznij dzień',()=>startDay(p,day,selectedCount),'program-primary').disabled=regularActive()||!!unresolved.length;
  }
 }else add(host,'h3','Program ukończony!');
 for(const [i,name] of p.weeks.entries()){
  const details=add(host,'details',null,'program-week');details.open=day?.week===i+1;
  add(details,'summary','Tydzień '+(i+1)+' — '+name);
  for(const d of p.days.filter(d=>d.week===i+1)){
   const done=d.day<pr.nextDay;
   const entry=add(details,'details',null,'program-day-detail');
   add(entry,'summary',(done?'✓ ':d.day===pr.nextDay?'→ ':'')+'Dzień '+d.day+' — '+d.title);
   const completed=pr.completed.find(x=>x.day===d.day);
   if(completed?.historyId!=null&&state.sessions.some(s=>String(s.id)===String(completed.historyId)))button(entry,'Pokaż podsumowanie treningu',()=>window.openSportSummary?.(completed.historyId));
   if(completed?.blockCount>0){
    add(entry,'p','Zrealizowano '+completed.blockCount+' z '+d.blocks.length+' bloków.');
    renderOverview(entry,core.build(dayFor(p,d.day,completed.scheduleRevision??1).blocks,completed.blockCount,p.blockRest),completed.records,-1);
   }
   for(const [bi,b] of d.blocks.entries()){
    const block=add(entry,'details');add(block,'summary',(bi===0?'Główna misja':'Blok bonusowy '+bi)+' · '+b.rounds+' rund');
    for(const m of b.moves)add(block,'p',m.name+' — '+target(m)+(m.note?' · '+m.note:'')+(m.unresolved?' · wymaga wyjaśnienia':''));
   }
   if(d.kind==='rest')add(entry,'p','Pełny odpoczynek.');
  }
 }
 const last=pr.completed.at(-1);if(last)add(host,'p','Ostatnio ukończony dzień: '+last.day+' · zapisane wyniki: '+last.records.length,'muted');
}
function render(){
 if(!host)return;
 if(!failed)syncHistory();
 host.replaceChildren();
 try{const v=getState();validate(v);
  if(errorMessage){add(host,'p',errorMessage,'program-warning');button(host,'Ponów zapis / odśwież stan',()=>{failed=false;errorMessage='';transition({type:'tick'});render();});}
  if(v.active)renderRun(v);else renderList(v);
 }catch(e){add(host,'p','Nie można bezpiecznie odczytać programu: '+e.message+'. Dotychczasowe dane nie zostały usunięte.','program-warning');}
}
function update(){
 if(!active()||failed)return;
 const run=getState().active.run;
 if(['running','rest'].includes(run?.status)){
  if(Date.now()>=run.deadline)transition({type:'tick'});
  else {const clock=document.getElementById('programClock');if(clock)clock.textContent=fmt(core.remaining(run,Date.now()));}
 }
}
window.MojaPrograms=Object.freeze({render,isActive:active,validate,syncHistory});
setInterval(update,250);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){update();if(!document.getElementById('programsPanel').classList.contains('hidden'))render();}});
render();
