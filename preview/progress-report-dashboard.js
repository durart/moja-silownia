/* Training reports dashboard. Read-only, derived from local workout history. */
(function(root){
'use strict';
const fmt=(n,d=0)=>Number.isFinite(n)?new Intl.NumberFormat('pl-PL',{maximumFractionDigits:d}).format(n):'—';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>new Date(s.date).getTime();
const week=t=>{const d=new Date(t),day=(d.getDay()+6)%7;d.setHours(0,0,0,0);d.setDate(d.getDate()-day);return d.getTime()};
const panel=(title,body,cls='')=>'<section class="report-panel '+cls+'"><h3>'+title+'</h3>'+body+'</section>';
const dateLabel=value=>new Date(value).toLocaleDateString('pl-PL',{day:'2-digit',month:'2-digit'});
const weeklyBars=rows=>{
 const max=Math.max(1,...rows.map(row=>row[1].sets));
 return '<div class="report-chart-wrap">'+rows.map(([date,value])=>'<div class="report-muscle"><div><b>'+esc(dateLabel(date))+'</b><span>'+value.sets+' serii</span></div><div class="report-meter"><i style="width:'+Math.round(value.sets/max*100)+'%"></i></div></div>').join('')+'</div>';
};
function build(sessions,exercises,profile,days=84){
 const core=root.ProgressCore;if(!core)return '<p>Moduł analityczny niedostępny.</p>';
 const all=core.clean(sessions),now=Date.now(),period=all.filter(s=>date(s)>=now-days*86400000&&date(s)<=now);
 const sets=period.flatMap(s=>s.sets.filter(core.validAnySet||core.validSet)),work=sets.filter(core.working);
 const volume=core.volume(sets),duration=period.reduce((n,s)=>n+(Number(s.durationSeconds)||0),0);
 const prior=all.filter(s=>date(s)>=now-2*days*86400000&&date(s)<now-days*86400000);
 const priorVolume=core.volume(prior.flatMap(s=>s.sets.filter(core.validAnySet||core.validSet)));
 const diff=priorVolume>0?(volume-priorVolume)/priorVolume*100:null;
 const ids=[...new Set(work.map(s=>s.exerciseId))];
 const kpi=(label,value,sub)=>'<div class="report-kpi"><small>'+label+'</small><strong>'+value+'</strong><span>'+sub+'</span></div>';
 const weeks=new Map();for(let i=Math.ceil(days/7)-1;i>=0;i--){const t=week(now-i*7*86400000);weeks.set(t,{volume:0,sets:0})}
 for(const s of period){const key=week(date(s));if(!weeks.has(key))weeks.set(key,{volume:0,sets:0});const row=weeks.get(key);const v=s.sets.filter(core.validAnySet||core.validSet);row.volume+=core.volume(v);row.sets+=v.filter(core.working).length}
 const wk=[...weeks].sort((a,b)=>a[0]-b[0]);
 const standard=period.filter(s=>!core.isRecovery(s));
 const priorWork=prior.flatMap(s=>s.sets.filter(core.validAnySet||core.validSet)).filter(core.working);
 const comparison=(label,current,previous,unit='')=>'<div class="item"><strong>'+label+'</strong><br>'+fmt(current,1)+unit+' · poprzednio '+fmt(previous,1)+unit+'</div>';
 return '<div class="report-dashboard"><div class="report-heading"><h2>Podsumowanie okresowe</h2><p>Ostatnie '+days+' dni · porównanie z poprzednim okresem tej samej długości</p></div>'+
 '<div class="report-export"><button type="button" onclick="progressReportExport()">Eksport CSV</button><button type="button" onclick="window.print()">Drukuj / zapisz PDF</button></div><div class="report-kpis">'+kpi('Łączny tonaż',fmt(volume)+' kg',diff===null?'Brak okresu porównawczego':(diff>0?'+':'')+fmt(diff,1)+'% vs poprzedni okres')+kpi('Treningi',fmt(period.length),fmt(standard.length)+' standardowych')+kpi('Serie robocze',fmt(work.length),fmt(ids.length)+' ćwiczeń')+kpi('Czas treningów',fmt(duration/3600,1)+' h','Z zapisanych czasów sesji')+'</div>'+
 panel('Porównanie okresów',comparison('Treningi',period.length,prior.length)+comparison('Serie robocze',work.length,priorWork.length)+comparison('Tonaż',volume,priorVolume,' kg')+(core.timedSeconds?.(sets)||core.timedSeconds?.(priorWork)?comparison('Czas izometrii',core.timedSeconds(sets),core.timedSeconds(prior.flatMap(s=>s.sets)),' s'):'')+comparison('Treningi tygodniowo',period.length*7/days,prior.length*7/days)+comparison('Serie na trening',period.length?work.length/period.length:0,prior.length?priorWork.length/prior.length:0))+
 panel('Serie robocze tygodniowo',weeklyBars(wk)+'<p class="report-hint">Tygodnie kalendarzowe; pierwszy i ostatni mogą być niepełne.</p>')+'</div>';

}
function csvCell(value){let v=String(value??'');if(/^[\s]*[=+@-]/.test(v)&&typeof value!=='number')v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}
function csv(sessions,exercises,days=84){
 const core=root.ProgressCore,now=Date.now(),names=new Map((exercises||[]).map(e=>[e.id,e.name]));
 const rows=[['Data','Ćwiczenie','Ciężar (kg)','Powtórzenia','RIR','Typ serii','Czas izometrii (s)']];
 for(const session of core.clean(sessions).filter(s=>date(s)>=now-days*86400000&&date(s)<=now)){
  for(const set of session.sets.filter(core.validAnySet||core.validSet))rows.push([session.date,names.get(set.exerciseId)||set.exerciseId,Number(set.weight),set.measurementType==='duration'?'':Number(set.reps),set.measurementType==='duration'?'':set.rir??'',core.working(set)?'Robocza':'Rozgrzewka',set.measurementType==='duration'?set.durationSeconds:'']);
 }
 return '\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
}
function download(sessions,exercises,days){
 const url=URL.createObjectURL(new Blob([csv(sessions,exercises,days)],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='raport-treningowy-'+days+'-dni.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
root.ProgressReportDashboard=Object.freeze({build,csv,download});
})(typeof window!=='undefined'?window:globalThis);
