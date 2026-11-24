/* Connect the persistent trainer draft model to the existing workout forms. */
(function() {
  'use strict';
  const drafts=window.MojaTrainerDrafts;
  const flags=new Set(['pain','equipment','technique']);
  const fieldNames={w:'weight',r:'reps',rir:'rir',type:'setType'};
  function entry(id,slot,target,completed) {
    if(!drafts.active(state))return null;
    const swapped=Number.isInteger(slot)&&state.workoutSwaps?.[slot]===id;
    if(swapped&&target)target={...target,weight:null,setDetails:target.setDetails?.map(detail=>({...detail,weight:null}))};
    const result=drafts.ensure(state,id,slot,target,completed);
    const modeChanged=drafts.refreshMode(state,id,slot,target,completed);
    if(result.changed||modeChanged)save();
    return result.entry;
  }
  function row(id,slot,index) {
    const value=drafts.row(state,id,slot,index);
    return value?{...value,weight:value.weight??'',reps:value.reps??''}:null;
  }
  function count(id,slot){return drafts.get(state,id,slot)?.rows.length;}
  function capture(id,slot,index,actual){return drafts.capture(state,id,slot,index,actual);}
  function append(id,slot,previous){return drafts.append(state,id,slot,previous);}
  function removeRow(id,slot,index,completed) {
    if(!drafts.removeRow(state,id,slot,index))return false;
    const item=completed[index];
    if(item)state.active=state.active.filter(x=>x!==item);
    const key=Number.isInteger(slot)?'planSetIndex':'manualSetIndex';
    completed.forEach((set,i)=>{if(set&&i>index)set[key]=i-1;});
    return true;
  }
  function removeExercise(id,slot){return drafts.removeExercise(state,id,slot);}
  function inputIdentity(input) {
    const plan=/^r_(\d+)_(\d+)_(w|r|rir|type)$/.exec(input.id);
    if(plan){
      const slot=Number(plan[1]),p=state.plans.find(p=>p.id===state.activePlan);
      const id=state.workoutSwaps?.[slot]??p?.exerciseIds?.[slot];
      return id?{id,slot,index:Number(plan[2]),field:fieldNames[plan[3]]}:null;
    }
    const manual=/^m_(.+)_(\d+)_(w|r|rir|type)$/.exec(input.id);
    return manual?{id:manual[1],slot:null,index:Number(manual[2]),field:fieldNames[manual[3]]}:null;
  }
  function onInput(event) {
    if(!drafts.active(state)||event.target.closest('.hevy-done'))return;
    const identity=inputIdentity(event.target);
    if(!identity)return;
    const {id,slot,index,field}=identity;
    if(drafts.change(state,id,slot,index,field,event.target.value))save();
  }
  function caution(id,card) {
    if(!drafts.active(state)||!flags.has(state.activeExerciseNotes?.[id]?.flag))return;
    const input=card?.querySelector('input[id$="_w"]');
    const identity=input?inputIdentity(input):null;
    const slot=identity?.slot??null,record=drafts.get(state,id,slot);
    if(!record)return;
    const completed=Number.isInteger(slot)?planSets(id,slot):manualSetRows(id);
    let changed=false;
    record.rows.forEach((value,i)=>{
      if(completed[i]||value?.edited)return;
      if(value?.weight!=null&&value.weight!==0){
        value.weight=null;changed=true;
        const field=document.getElementById(Number.isInteger(slot)?'r_'+slot+'_'+i+'_w':'m_'+id+'_'+i+'_w');
        if(field)field.value='';
      }
    });
    if(changed){record.reason='review';save();}
  }
  function renderSettings(root) {
    if(!root)return;
    const prefs=drafts.settings(state),section=document.createElement('div');
    section.className='card';section.id='trainerSettings';
    const title=document.createElement('h2');title.textContent='Asystent Trenera';section.append(title);
    for(const [key,label] of [['weights','Automatycznie uzupełniaj ciężary'],['reps','Automatycznie uzupełniaj powtórzenia'],['sets','Automatycznie przygotowuj serie'],['explanation','Pokazuj uzasadnienie zaleceń']]){
      const line=document.createElement('label');line.style.display='flex';line.style.alignItems='center';line.style.gap='8px';
      const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=prefs[key];checkbox.style.width='auto';
      checkbox.addEventListener('change',()=>{
        const previous=state.trainerSettings;
        state.trainerSettings={...drafts.settings(state),[key]:checkbox.checked};
        if(!save()){state.trainerSettings=previous;checkbox.checked=!checkbox.checked;return;}
        note('Ustawienia asystenta zapisane. Obowiązują dla nowo przygotowanych ćwiczeń.');
      });
      line.append(checkbox,document.createTextNode(label));section.append(line);
    }
    const hint=document.createElement('p');hint.className='profile-small';
    hint.textContent='Regeneracja, ból i zmiana sprzętu zawsze ograniczają automatyczne zalecenia. Zapisane wyniki nie są zmieniane.';section.append(hint);
    root.append(section);
  }
  function init(){
    for(const id of ['planWorkout','today']){
      const root=document.getElementById(id);
      root?.addEventListener('input',onInput);
      root?.addEventListener('change',onInput);
    }
  }
  window.MojaTrainerWorkoutUI=Object.freeze({entry,row,count,capture,append,removeRow,removeExercise,caution,renderSettings});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
