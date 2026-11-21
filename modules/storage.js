// Pure storage helpers; no browser globals or state mutations.
export function isValidBackup(value){
 return !!value&&typeof value==='object'&&Array.isArray(value.exercises)&&
 Array.isArray(value.active)&&Array.isArray(value.sessions)&&
 value.exercises.every(e=>typeof e?.id==='string'&&typeof e?.name==='string');
}
export function serializeBackup(state,pretty=false){return JSON.stringify(state,null,pretty?2:undefined)}
export function parseBackup(text){
 const value=JSON.parse(text);
 if(!isValidBackup(value))throw new Error('Nieprawidłowy format');
 return value;
}
export function chooseBackup(previous,next,isValid){
 return !!previous&&previous!==next&&isValid(previous)?previous:null;
}
