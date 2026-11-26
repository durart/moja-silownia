// Cardio presentation helpers. Rendering does not mutate workout state.
(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./cardio-catalog.js'):root.MojaCardioCatalog,node?require('./cardio-core.js'):root.MojaCardioCore);
  if(node)module.exports=api;
  if(root)root.MojaCardioUI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function makeCardioUi(catalog,core) {
  'use strict';
  const fields=Object.freeze({
    durationSeconds:{label:'Czas (min)',step:'0.01',min:0.01,max:1440,scale:60},
    distanceMeters:{label:'Dystans (km)',step:'0.001',min:0.001,max:1000,scale:1000},
    speedKmh:{label:'Prędkość (km/h)',step:'0.1',min:0.1,max:150,scale:1},
    inclinePercent:{label:'Nachylenie (%)',step:'0.1',min:-30,max:50,scale:1},
    floors:{label:'Liczba pięter',step:'1',min:1,max:10000,scale:1},
    paceSecondsPer500m:{label:'Tempo (s / 500 m)',step:'1',min:1,max:86400,scale:1},
    rpe:{label:'RPE (1–10, opcjonalnie)',step:'1',min:1,max:10,scale:1}
  });
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  function clock(seconds) {
    const n=Math.max(0,Math.floor(Number(seconds)||0));
    return [Math.floor(n/3600),Math.floor(n/60)%60,n%60].map(x=>String(x).padStart(2,'0')).join(':');
  }
  function metricInputValue(key,value) {
    if(value==null)return '';
    return String(Math.round(value/fields[key].scale*10000)/10000);
  }
  function parseMetric(key,raw) {
    if(raw===''||raw==null)return null;
    if(typeof raw!=='string'&&typeof raw!=='number')throw new RangeError('Invalid cardio input');
    const text=String(raw).trim().replace(',','.');
    if(!/^-?\d+(?:\.\d+)?$/.test(text))throw new RangeError('Invalid cardio input');
    let value=Number(text)*fields[key].scale;
    if(key==='durationSeconds')value=Math.round(value);
    if(!core.validMetric(key,value))throw new RangeError('Invalid cardio metric: '+key);
    return value;
  }
  function draftFromHistory(exerciseId,sessions) {
    const prior=(Array.isArray(sessions)?sessions:[]).flatMap(s=>Array.isArray(s?.cardio)?s.cardio:[])
      .filter(a=>a?.exerciseId===exerciseId&&core.validMetric('durationSeconds',a.durationSeconds))
      .sort((a,b)=>Date.parse(b.at)-Date.parse(a.at))[0];
    if(!prior)return {};
    const draft={};
    for(const key of ['speedKmh','inclinePercent'])if(core.validMetric(key,prior[key]))draft[key]=prior[key];
    return draft;
  }
  function thumbnail(exerciseId) {
    const ex=catalog.getExercise(exerciseId);
    return ex?'<img class="cardio-thumbnail" src="'+escape(ex.imagePath)+'" alt="" loading="lazy" style="width:100%;height:100%;object-fit:contain">':'';
  }
  function activityLabel(activity) {
    const ex=catalog.getExercise(activity?.exerciseId);
    if(!ex)return '';
    const parts=[ex.name,clock(activity.durationSeconds)];
    for(const key of ex.metrics.filter(k=>k!=='durationSeconds')){
      if(activity[key]==null)continue;
      const values={distanceMeters:' km',speedKmh:' km/h',inclinePercent:'%',floors:' pięter',paceSecondsPer500m:' s/500 m',rpe:' RPE'};
      parts.push(metricInputValue(key,activity[key])+values[key]);
    }
    return parts.join(' · ');
  }
  function recommendationHtml(recommendation) {
    if(!recommendation)return '';
    const reasons={
      'no-history':'Pierwsza aktywność. Ustaw komfortowe tempo.',
      'plan-target':'Cel zapisany w planie. Dostosuj intensywność do samopoczucia.',
      'recovery':'Sesja regeneracyjna – bez zwiększania obciążenia. Dostosuj intensywność do samopoczucia.',
      'history-gap':'Dłuższa przerwa lub nieprawidłowa data – bez automatycznej progresji.',
      'high-rpe':'Ostatni wysiłek był bardzo wysoki – rozważ lżejszą aktywność.',
      'need-two-sessions':'Potrzebne są dwie porównywalne sesje z różnych dni.',
      'missing-rpe':'Brak oceny wysiłku – pozostawiam ostatnie parametry.',
      'effort':'Ostatnie sesje nie były lekkie – utrzymaj parametry.',
      'not-comparable':'Ostatnie aktywności różnią się obciążeniem – bez zwiększania.',
      'duration':'Dwie porównywalne sesje o niskim RPE – wydłuż czas.',
      'incline':'Dwie porównywalne sesje o niskim RPE – zwiększ nachylenie.',
      'speed':'Dwie porównywalne sesje o niskim RPE – zwiększ prędkość.',
      'at-limit':'Osiągnięto domyślny limit automatycznej progresji.'
    };
    const target=recommendation.target||{},parts=[];
    if(target.durationSeconds!=null)parts.push(clock(target.durationSeconds));
    if(target.speedKmh!=null)parts.push(metricInputValue('speedKmh',target.speedKmh)+' km/h');
    if(target.inclinePercent!=null)parts.push(metricInputValue('inclinePercent',target.inclinePercent)+'%');
    return '<aside class="cardio-recommendation"><strong>Asystent kardio'+(recommendation.action==='increase'?' · Progresja':'')+'</strong>'+
      (parts.length?'<p>Cel: '+escape(parts.join(' · '))+'</p>':'')+
      '<p class="hint">'+escape(reasons[recommendation.reason]||'Dostosuj parametry do swoich możliwości.')+'</p>'+
      '<p class="hint">Cel nie jest zapisem wykonanego czasu. Parametry możesz zmienić.</p></aside>';
  }
  function renderCard(exerciseId,position,{draft={},activity=null,timer=null,now=Date.now(),blocked=false,recommendation=null}={}) {
    const ex=catalog.getExercise(exerciseId);
    if(!ex)return '';
    const own=timer?.exerciseId===exerciseId;
    let seconds=activity?.durationSeconds??draft.durationSeconds??0;
    if(own){try{seconds=core.elapsedSeconds(timer,now)}catch{seconds=Math.floor((timer.accumulatedMs||0)/1000)}}
    const active=own&&timer.status==='running',paused=own&&timer.status==='paused';
    const btn=(action,label,disabled=false,cls='secondary')=>'<button type="button" class="'+cls+'" data-cardio-action="'+action+'"'+(disabled?' disabled':'')+'>'+label+'</button>';
    const inputs=ex.metrics.map(key=>{
      const f=fields[key],value=metricInputValue(key,(activity||draft)[key]);
      return '<label>'+escape(f.label)+'<input type="number" inputmode="decimal" data-cardio-field="'+key+'" min="'+f.min+'" max="'+f.max+'" step="'+f.step+'" value="'+escape(value)+'"'+(activity||(own&&key==='durationSeconds')?' disabled':'')+'></label>';
    }).join('');
    return '<div class="exercise-card hevy-card cardio-card" data-exercise-id="'+escape(ex.id)+'" data-cardio-id="'+escape(ex.id)+'">'+
      '<div class="sport-exercise-title-row"><span class="sport-exercise-art">'+thumbnail(ex.id)+'</span><div class="sport-exercise-title-text"><h2>'+escape(position+'. '+ex.name)+'</h2><span class="sport-muscle-chip">Kardio'+(activity?' · Wykonane':'')+'</span></div></div>'+
      '<div class="cardio-body">'+(activity?'':recommendationHtml(recommendation))+'<div class="cardio-clock" aria-live="off" data-cardio-clock>'+clock(seconds)+'</div>'+
      '<div class="toolbar cardio-timer-actions">'+(activity?btn('undo','Cofnij zapis',blocked):active?btn('pause','Pauza')+btn('stop','Zatrzymaj'):paused?btn('resume','Wznów')+btn('stop','Zatrzymaj'):btn('start','Uruchom stoper',blocked||!!timer)+btn('remove','Usuń ćwiczenie',blocked||!!timer))+'</div>'+
      '<div class="cardio-fields">'+inputs+'</div>'+
      (activity?'<p class="hint">✓ Aktywność zapisana</p>':btn('save','Zapisz kardio',!!timer||blocked,'cardio-save'))+'</div></div>';
  }
  return Object.freeze({fields,clock,metricInputValue,parseMetric,draftFromHistory,thumbnail,activityLabel,recommendationHtml,renderCard,escape});
});
