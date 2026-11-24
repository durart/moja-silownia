/* Training reports dashboard. Read-only, derived from local workout history. */
(function(root){
'use strict';
const fmt=(n,d=0)=>Number.isFinite(n)?new Intl.NumberFormat('pl-PL',{maximumFractionDigits:d}).format(n):'—';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>new Date(s.date).getTime();
const week=t=>{const d=new Date(t),day=(d.getDay()+6)%7;d.setHours(0,0,0,0);d.setDate(d.getDate()-day);return d.getTime()};
const panel=(title,body,cls='')=>'<section class="report-panel '+cls+'"><h3>'+title+'</h3>'+body+'</section>';
const chart=(values,color='#10b981',labels=[])=>{
 const valid=values.filter(Number.isFinite);
 if(!valid.length)return '<p class="report-empty">Brak danych w wybranym okresie.</p>';
 const max=Math.max(...valid),min=Math.min(...valid),span=max-min||Math.max(Math.abs(max)*.1,1),w=560,h=210;
 const points=values.map((v,i)=>Number.isFinite(v)?{x:42+i*(w-64)/Math.max(1,values.length-1),y:160-(v-min)/span*112,value:v,label:labels[i]||'Pomiar '+(i+1)}:null);
 const segments=[];let run=[];for(const p of points){if(!p){if(run.length>1)segments.push(run);run=[]}else run.push(p)}if(run.length>1)segments.push(run);
 const first=points.find(Boolean),last=points.filter(Boolean).at(-1);
 const axis='<text x="42" y="191" fill="#a1a1aa" font-size="13">'+esc(first.label)+'</text><text x="518" y="191" text-anchor="end" fill="#a1a1aa" font-size="13">'+esc(last.label)+'</text>';
 return '<div class="report-chart-wrap"><svg viewBox="0 0 560 210" role="img" aria-label="Wykres wartości w czasie" class="report-chart"><line x1="42" y1="160" x2="518" y2="160" stroke="#52525b"/>'+
 segments.map(seg=>'<polyline points="'+seg.map(p=>p.x+','+p.y).join(' ')+'" fill="none" stroke="'+color+'" stroke-width="3" stroke-linejoin="round"/>').join('')+
 points.filter(Boolean).map(p=>'<circle cx="'+p.x+'" cy="'+p.y+'" r="6" fill="'+color+'"><title>'+esc(p.label)+': '+fmt(p.value,1)+'</title></circle>').join('')+axis+'</svg>'+
 '<div class="report-chart-values"><span>Początek: <strong>'+fmt(first.value,1)+'</strong></span><span>Koniec: <strong>'+fmt(last.value,1)+'</strong></span></div></div>';
};
const dateLabel=value=>{const t=new Date(value);return Number.isFinite(t.getTime())?t.toLocaleDateString('pl-PL',{day:'2-digit',month:'2-digit'}):'—'};

function build(sessions,exercises,profile,days=84){
 const core=root.ProgressCore;if(!core)return '<p>Moduł analityczny niedostępny.</p>';
 const all=core.clean(sessions),now=Date.now(),period=all.filter(s=>date(s)>=now-days*86400000&&date(s)<=now);
 const sets=period.flatMap(s=>s.sets.filter(core.validSet)),work=sets.filter(core.working);
 const volume=core.volume(sets),duration=period.reduce((n,s)=>n+(Number(s.durationSeconds)||0),0);
 const prior=all.filter(s=>date(s)>=now-2*days*86400000&&date(s)<now-days*86400000);
 const priorVolume=core.volume(prior.flatMap(s=>s.sets.filter(core.validSet)));
 const diff=priorVolume>0?(volume-priorVolume)/priorVolume*100:null;
 const ids=[...new Set(work.map(s=>s.exerciseId))],names=new Map((exercises||[]).map(e=>[e.id,e.name]));
 const kpi=(label,value,sub)=>'<div class="report-kpi"><small>'+label+'</small><strong>'+value+'</strong><span>'+sub+'</span></div>';
 const weeks=new Map();for(let i=Math.ceil(days/7)-1;i>=0;i--){const t=week(now-i*7*86400000);weeks.set(t,{volume:0,sets:0})}
 for(const s of period){const key=week(date(s));if(!weeks.has(key))weeks.set(key,{volume:0,sets:0});const row=weeks.get(key);const v=s.sets.filter(core.validSet);row.volume+=core.volume(v);row.sets+=v.filter(core.working).length}
 const wk=[...weeks].sort((a,b)=>a[0]-b[0]),volumes=wk.map(x=>x[1].volume);
 const weightRows=(profile?.weightHistory||[]).filter(x=>Number.isFinite(Number(x.weightKg))&&Number.isFinite(Date.parse(x.date))&&Date.parse(x.date)>=now-days*86400000&&Date.parse(x.date)<=now).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
 const weightChange=weightRows.length>1?Number(weightRows.at(-1).weightKg)-Number(weightRows[0].weightKg):null;
 const standard=period.filter(s=>!core.isRecovery(s));
 const exerciseRows=ids.map(id=>{const rows=core.exerciseSessions(period,id).filter(r=>r.sessionMode==='standard');const first=rows.find(r=>r.comparableOneRM!==null),last=rows.filter(r=>r.comparableOneRM!==null).at(-1);const delta=first&&last&&first!==last&&first.comparableOneRM>0?(last.comparableOneRM/first.comparableOneRM-1)*100:null;return {id,name:names.get(id)||id,volume:core.volume(work.filter(s=>s.exerciseId===id)),first,last,delta,rows}}).sort((a,b)=>b.volume-a.volume);
 const top=exerciseRows.filter(x=>x.rows.some(r=>Number.isFinite(r.comparableOneRM))).slice(0,3);
 const comparison=top.map((x,i)=>'<div class="report-comparison"><h4>'+esc(x.name)+'</h4>'+chart(x.rows.map(r=>r.comparableOneRM),['#10b981','#06b6d4','#a78bfa'][i],x.rows.map(r=>dateLabel(r.date||r.timestamp)))+'</div>').join('');
 const group=new Map();for(const s of work){const g=(exercises||[]).find(e=>e.id===s.exerciseId)?.group||'Inne';const v=group.get(g)||{sets:0,volume:0};v.sets++;v.volume+=Number(s.weight)*Number(s.reps);group.set(g,v)}
 const maxGroup=Math.max(1,...[...group.values()].map(v=>v.sets));
 const muscle=[...group].sort((a,b)=>b[1].sets-a[1].sets).map(([g,v])=>'<div class="report-muscle"><div><b>'+esc(g)+'</b><span>'+v.sets+' serii · '+fmt(v.volume)+' kg</span></div><div class="report-meter"><i style="width:'+Math.round(v.sets/maxGroup*100)+'%"></i></div></div>').join('')||'<p class="report-empty">Brak serii roboczych.</p>';
 const mobileRows=exerciseRows.map(x=>'<details class="report-exercise-card"><summary><strong>'+esc(x.name)+'</strong><span>'+fmt(x.volume)+' kg <span aria-hidden="true">⌄</span></span></summary><dl><div><dt>e1RM początek</dt><dd>'+fmt(x.first?.comparableOneRM,1)+' kg</dd></div><div><dt>e1RM koniec</dt><dd>'+fmt(x.last?.comparableOneRM,1)+' kg</dd></div><div><dt>Zmiana</dt><dd>'+(x.delta===null?'—':(x.delta>0?'+':'')+fmt(x.delta,1)+'%')+'</dd></div><div><dt>Tonaż</dt><dd>'+fmt(x.volume)+' kg</dd></div></dl></details>').join('');
 const atlasModel=(root.MuscleAtlasCore?.MUSCLES||[]).map(name=>{const v=group.get(name),score=v?Math.round(v.sets/maxGroup*100):0;return {name,score,label:(v?.sets||0)+' serii roboczych',exerciseCount:0}});
 const atlas=group.size&&root.MuscleAnatomyArt&&atlasModel.length?'<div class="report-atlas">'+root.MuscleAnatomyArt.renderAtlas(atlasModel)+'</div><p class="report-hint">Kolory pokazują względną liczbę serii w wybranym okresie, nie zmęczenie ani normy treningowe.</p>':'';
 const rows=exerciseRows.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+fmt(x.first?.comparableOneRM,1)+'</td><td>'+fmt(x.last?.comparableOneRM,1)+'</td><td>'+ (x.delta===null?'—':(x.delta>0?'+':'')+fmt(x.delta,1)+'%')+'</td><td>'+fmt(x.volume)+' kg</td></tr>').join('');
 return '<div class="report-dashboard"><div class="report-heading"><div><h2>Raport postępów treningowych</h2><p>Ostatnie '+days+' dni · dane z historii treningów</p></div><div class="report-range">'+[[28,'4 tygodnie'],[84,'12 tygodni'],[168,'6 miesięcy']].map(([n,l])=>'<button type="button" class="'+(n===days?'active':'')+'" onclick="progressReportDays('+n+')">'+l+'</button>').join('')+'</div></div>'+
 '<div class="report-export"><button type="button" onclick="progressReportExport()">Eksport CSV</button><button type="button" onclick="window.print()">Drukuj / zapisz PDF</button></div><div class="report-kpis">'+kpi('Łączny tonaż',fmt(volume)+' kg',diff===null?'Brak okresu porównawczego':(diff>0?'+':'')+fmt(diff,1)+'% vs poprzedni okres')+kpi('Treningi',fmt(period.length),fmt(standard.length)+' standardowych')+kpi('Serie robocze',fmt(work.length),fmt(ids.length)+' ćwiczeń')+kpi('Czas treningów',fmt(duration/3600,1)+' h','Z zapisanych czasów sesji')+'</div>'+
 '<div class="report-grid">'+panel('Progresja siłowa — e1RM',top.length?'<p class="report-hint">Do trzech ćwiczeń o największym tonażu z wiarygodnym e1RM. Każdy wykres ma własną skalę.</p>'+comparison:'<p class="report-empty">Brak danych e1RM.</p>','wide')+
 panel('Obciążenie partii mięśniowych','<p class="report-hint">Serie robocze według głównej partii ćwiczenia; bez sztucznych norm MAV.</p>'+atlas+muscle)+
 panel('Tonaż tygodniowy','<p class="report-hint">Objętość z zapisanych serii, łącznie z rozgrzewką.</p>'+chart(volumes,'#8b5cf6',wk.map(x=>dateLabel(x[0]))))+
 panel('Masa ciała',weightRows.length?'<p class="report-hint">Zmiana: '+(weightChange===null?'za mało pomiarów':(weightChange>0?'+':'')+fmt(weightChange,1)+' kg')+'</p>'+chart(weightRows.map(x=>Number(x.weightKg)),'#06b6d4',weightRows.map(x=>dateLabel(x.date))):'<p class="report-empty">Brak pomiarów masy ciała w tym okresie.</p>')+
 panel('Dziennik ćwiczeń','<div class="report-mobile-exercises">'+mobileRows+'</div><div class="report-table-wrap"><table><thead><tr><th>Ćwiczenie</th><th>e1RM start</th><th>e1RM koniec</th><th>Zmiana</th><th>Tonaż</th></tr></thead><tbody>'+rows+'</tbody></table></div><p class="report-hint">e1RM wyliczane z porównywalnych serii. Brak danych oznaczono kreską.</p>','full')+'</div></div>';
}
function csvCell(value){let v=String(value??'');if(/^[\s]*[=+@-]/.test(v)&&typeof value!=='number')v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}
function csv(sessions,exercises,days=84){
 const core=root.ProgressCore,now=Date.now(),names=new Map((exercises||[]).map(e=>[e.id,e.name]));
 const rows=[['Data','Ćwiczenie','Ciężar (kg)','Powtórzenia','RIR','Typ serii']];
 for(const session of core.clean(sessions).filter(s=>date(s)>=now-days*86400000&&date(s)<=now)){
  for(const set of session.sets.filter(core.validSet))rows.push([session.date,names.get(set.exerciseId)||set.exerciseId,Number(set.weight),Number(set.reps),set.rir??'',core.working(set)?'Robocza':'Rozgrzewka']);
 }
 return '\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
}
function download(sessions,exercises,days){
 const url=URL.createObjectURL(new Blob([csv(sessions,exercises,days)],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='raport-treningowy-'+days+'-dni.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
root.ProgressReportDashboard=Object.freeze({build,csv,download});
})(typeof window!=='undefined'?window:globalThis);
