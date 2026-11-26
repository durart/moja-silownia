// Shared synchronous storage recovery policy.
(function(root){
 function validState(value){
  const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  return record(value)&&['exercises','active','sessions'].every(k=>Array.isArray(value[k])&&value[k].every(record))&&
   value.exercises.every(e=>typeof e.id==='string'&&e.id.trim().length>0&&typeof e.name==='string')&&
   value.sessions.every(s=>s.sessionMode==null||['standard','recovery'].includes(s.sessionMode))&&
   (value.activeSessionMode==null||['standard','recovery'].includes(value.activeSessionMode));
 }
 function readState(raw){try{const value=JSON.parse(raw);return validState(value)?value:null;}catch{return null;}}
 function serializeState(state){
  if(!validState(state))throw Error('Invalid workout state');
  const raw=JSON.stringify(state);
  if(!readState(raw))throw Error('Invalid serialized workout state');
  return raw;
 }
 function inspect(storage,key,parse,seeds){
  const backupKey=key+'-previous-valid',corruptKey=key+'-unreadable';
  let primary=null,backup=null;
  try{primary=storage.getItem(key);backup=storage.getItem(backupKey);}
  catch(error){return {state:parse(primary)||{exercises:seeds,active:[],sessions:[]},source:'error',blocked:true,primary,backup};}
  const current=parse(primary),previous=parse(backup);
  if(current)return {state:current,source:'primary',blocked:false,primary,backup};
  const blocked=primary!==null||backup!==null;
  if(primary!==null){try{if(storage.getItem(corruptKey)===null)storage.setItem(corruptKey,primary);}catch(error){console.warn('Recovery archive unavailable',error);}}
  return {state:previous||{exercises:seeds,active:[],sessions:[]},source:previous?'backup':'new',blocked,primary,backup,unreadable:primary};
 }
 function restore(storage,key,parse,snapshot){
  if(!snapshot.blocked||snapshot.source!=='backup'||!parse(snapshot.backup))throw Error('No verified backup');
  if(storage.getItem(key)!==snapshot.primary||storage.getItem(key+'-previous-valid')!==snapshot.backup)throw Error('Storage changed');
  const archive=key+'-recovery-original';
  const original=JSON.stringify({primary:snapshot.primary,backup:snapshot.backup});
  const existing=storage.getItem(archive);
  if(existing!==null&&existing!==original)throw Error('Recovery archive already exists');
  storage.setItem(archive,original);
  if(storage.getItem(archive)!==original)throw Error('Archive verification failed');
  storage.setItem(key,snapshot.backup);
  return true;
 }
 root.MojaStorageRecovery=Object.freeze({inspect,restore,validState,readState,serializeState});
})(globalThis);
