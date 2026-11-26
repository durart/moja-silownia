// Connect cardio cards to the existing workout and persistence lifecycle.
(function(root){
  'use strict';
  const catalog=root.MojaCardioCatalog,core=root.MojaCardioCore,ui=root.MojaCardioUI;
  const isId=id=>!!catalog.getExercise(id);
  const list=()=>Array.isArray(state.activeCardio)?state.activeCardio:[];
  const timer=()=>state.cardioTimer||null;
  const draftFor=id=>state.cardioDrafts?.[id]??ui.draftFromHistory(id,state.sessions);
  const activityFor=id=>list().find(a=>a.exerciseId===id)||null;
  function hasRecords(){return list().length>0;}
  function busy(){if(!timer())return false;note('Najpierw zatrzymaj stoper kardio.');return true;}
  function clear(){delete state.activeCardio;delete state.cardioDrafts;delete state.cardioTimer;}
  function validContext(id){return isId(id)&&!!state.startedAt&&state.manualStarted&&!state.activePlan&&manualIds().includes(id);}
  function render(id,index){return ui.renderCard(id,index,{draft:draftFor(id),activity:activityFor(id),timer:timer(),blocked:!!state.timedTimer});}
  function persist(mutate){
    const snapshot=structuredClone(state);
    try{mutate();if(save()===false)throw Error('Storage write failed');return true;}
    catch(error){state=snapshot;note('Nie zapisano kardio. Sprawdź dostępne miejsce lub dane.');return false;}
  }
  function readFields(card,id,{skipDuration=false}={}){
    const values={...draftFor(id)};
    for(const input of card.querySelectorAll('[data-cardio-field]')){
      const key=input.dataset.cardioField;
      if(!catalog.getExercise(id).metrics.includes(key)||skipDuration&&key==='durationSeconds')continue;
      const value=ui.parseMetric(key,input.value);
      if(value==null)delete values[key];else values[key]=value;
    }
    return values;
  }
  function remember(id,values){state.cardioDrafts??={};state.cardioDrafts[id]=values;}
  function updateClocks(){
    const current=timer();
    if(!current)return;
    for(const card of document.querySelectorAll('.cardio-card')){
      if(card.dataset.cardioId!==current.exerciseId)continue;
      try{card.querySelector('[data-cardio-clock]').textContent=ui.clock(core.elapsedSeconds(current,Date.now()));}
      catch(error){/* Preserve persisted timer until the clock becomes valid. */}
    }
  }
  function onChange(event){
    const input=event.target.closest('[data-cardio-field]');
    const card=input?.closest('.cardio-card'),id=card?.dataset.cardioId;
    if(!validContext(id)||activityFor(id))return;
    try{const values=readFields(card,id,{skipDuration:timer()?.exerciseId===id});persist(()=>remember(id,values));}
    catch(error){note('Sprawdź wpisane parametry kardio.');}
  }
  function onClick(event){
    const button=event.target.closest('button[data-cardio-action]'),card=button?.closest('.cardio-card'),id=card?.dataset.cardioId;
    if(!validContext(id))return;
    const action=button.dataset.cardioAction,current=timer(),existing=activityFor(id),own=current?.exerciseId===id;
    try{
      let message='';
      if(action==='undo'){
        if(!existing||current||window.MojaTimedWorkout.busy())return;
        if(!confirm('Cofnąć zapis tej aktywności? Parametry pozostaną do edycji.'))return;
        const metrics={};for(const key of catalog.getExercise(id).metrics)if(existing[key]!=null)metrics[key]=existing[key];
        if(!persist(()=>{state.activeCardio=list().filter(a=>a.id!==existing.id);remember(id,metrics);}))return;
        message='Aktywność przywrócona do edycji.';
      }else if(action==='remove'){
        if(existing||current||window.MojaTimedWorkout.busy())return;
        if(!confirm('Usunąć ćwiczenie kardio z bieżącego treningu?'))return;
        if(!persist(()=>{state.manualExerciseIds=manualIds().filter(x=>x!==id);if(state.cardioDrafts)delete state.cardioDrafts[id];}))return;
        message='Usunięto kardio.';
      }else if(action==='start'){
        if(existing||current||window.MojaTimedWorkout.busy())return;
        const values=readFields(card,id);
        const activityId=globalThis.crypto?.randomUUID?.()||('cardio-'+Date.now()+'-'+Math.random().toString(36).slice(2));
        if(!persist(()=>{remember(id,values);state.cardioTimer=core.startTimer({workoutId:state.startedAt,exerciseId:id,activityId},Date.now());state.restUntil=null;}))return;
        restAudioStop();message='Stoper kardio uruchomiony.';
      }else if(action==='pause'||action==='resume'||action==='stop'){
        if(!own||existing||current.workoutId!==state.startedAt)return;
        const values=readFields(card,id,{skipDuration:true});
        if(!persist(()=>{
          if(action==='pause')state.cardioTimer=core.pauseTimer(current,Date.now());
          else if(action==='resume')state.cardioTimer=core.resumeTimer(current,Date.now());
          else{values.durationSeconds=core.stopTimer(current,Date.now()).durationSeconds;delete state.cardioTimer;}
          remember(id,values);
        }))return;
        message=action==='stop'?'Czas zmierzony. Zapisz aktywność.':action==='pause'?'Stoper wstrzymany.':'Stoper wznowiony.';
      }else if(action==='save'){
        if(existing||current||window.MojaTimedWorkout.busy())return;
        const values=readFields(card,id);
        const activityId=globalThis.crypto?.randomUUID?.()||('cardio-'+Date.now()+'-'+Math.random().toString(36).slice(2));
        const activity=core.createActivity(id,values,{id:activityId,at:new Date().toISOString()});
        if(!persist(()=>{state.activeCardio=[...list(),activity];if(state.cardioDrafts)delete state.cardioDrafts[id];}))return;
        message='✓ Aktywność kardio zapisana.';
      }else return;
      renderToday();tick();note(message);
    }catch(error){note('Sprawdź parametry i czas aktywności kardio.');}
  }
  document.addEventListener('click',onClick);
  document.addEventListener('change',onChange);
  root.MojaCardioWorkout=Object.freeze({hasRecords,busy,clear,render,updateClocks,list,activityFor,timer});
})(window);
