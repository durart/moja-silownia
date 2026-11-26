// Browser storage adapter with dependency injection for tests.
import {readState,selectInitialState} from './state-core.js';
export function createStateStorage(storage,{key='moja-silownia-v01',isValid}={}){
 const backupKey=key+'-previous-valid',corruptKey=key+'-unreadable';
 const valid=isValid||((raw)=>readState(raw)!==null);
 function get(name){return storage.getItem(name)}
 function load(seeds){
  return globalThis.MojaStorageRecovery.inspect(storage,key,readState,seeds);
 }
 function persist(state){
  const next=globalThis.MojaStorageRecovery.serializeState(state),previous=get(key);
  if(previous===null&&get(backupKey)!==null)throw Error('Recovery required');
  if(previous!==null&&!valid(previous))throw Error('Unsafe existing state');
  if(previous&&previous!==next&&valid(previous)){
   try{storage.setItem(backupKey,previous)}catch(error){console.warn('Kopia poprzedniego stanu nieudana',error)}
  }
  storage.setItem(key,next);
  return true;
 }
 return Object.freeze({key,backupKey,corruptKey,get,load,persist});
}
