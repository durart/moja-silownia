// Pure storage helpers; no browser globals or state mutations.
export function isValidBackup(value){return globalThis.MojaStorageRecovery.validState(value)}
export function serializeBackup(state,pretty=false){return JSON.stringify(state,null,pretty?2:undefined)}
export function parseBackup(text){
 const value=JSON.parse(text);
 if(!isValidBackup(value))throw new Error('Nieprawidłowy format');
 return value;
}
export function chooseBackup(previous,next,isValid){
 return !!previous&&previous!==next&&isValid(previous)?previous:null;
}
