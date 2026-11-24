// Browser storage adapter with dependency injection for tests.
import {readState,selectInitialState} from './state-core.js';
export function createStateStorage(storage,{key='moja-silownia-v01',isValid}={}){
 const backupKey=key+'-previous-valid',corruptKey=key+'-unreadable';
 const valid=isValid||((raw)=>readState(raw)!==null);
 function get(name){try{return storage.getItem(name)}catch(error){return null}}
 function load(seeds){
  const primary=get(key),backup=get(backupKey);
  const result=selectInitialState(primary,backup,seeds);
  if(result.unreadable){try{storage.setItem(corruptKey,result.unreadable)}catch(error){console.error('Nie można zabezpieczyć uszkodzonego zapisu',error)}}
  return result;
 }
 function persist(state){
  const next=JSON.stringify(state),previous=get(key);
  if(previous&&previous!==next&&valid(previous)){
   try{storage.setItem(backupKey,previous)}catch(error){console.warn('Kopia poprzedniego stanu nieudana',error)}
  }
  storage.setItem(key,next);
  return true;
 }
 return Object.freeze({key,backupKey,corruptKey,get,load,persist});
}
