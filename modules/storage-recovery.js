// Shared synchronous storage recovery policy.
(function(root){
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
 root.MojaStorageRecovery=Object.freeze({inspect,restore});
})(globalThis);
