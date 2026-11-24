const APP="moja-silownia";
const VERSION=1;
export function validateState(data){
 if(!data || typeof data!=="object" || !Array.isArray(data.exercises) || !Array.isArray(data.active) || !Array.isArray(data.sessions) || !data.exercises.every(e=>typeof e?.id==="string" && typeof e?.name==="string"))throw new Error("Nieprawidłowe dane treningowe.");
 if(data.sessions.some(s=>!s || typeof s!=="object" || (s.sessionMode!=null && !["standard","recovery"].includes(s.sessionMode))))throw new Error("Nieprawidłowa historia treningów.");
 if(data.activeSessionMode!=null && !["standard","recovery"].includes(data.activeSessionMode))throw new Error("Nieprawidłowy tryb treningu.");
 return data;
}
export function createBackup(data,now=new Date()){
 return {app:APP,schemaVersion:VERSION,exportedAt:now.toISOString(),data:validateState(data)};
}
export function parseBackup(text){
 if(typeof text!=="string" || text.length>25*1024*1024)throw new Error("Nieprawidłowy rozmiar kopii.");
 const value=JSON.parse(text);
 if(value && ("app" in Object(value) || "schemaVersion" in Object(value))){
  if(value.app!==APP || value.schemaVersion!==VERSION || !Number.isFinite(Date.parse(value.exportedAt)))throw new Error("Nieobsługiwana kopia zapasowa.");
  return validateState(value.data);
 }
 return validateState(value);
}
export function backupFilename(now=new Date()){
 const pad=n=>String(n).padStart(2,"0");
 return "backup_"+now.getFullYear()+"-"+pad(now.getMonth()+1)+"-"+pad(now.getDate())+"_"+pad(now.getHours())+"-"+pad(now.getMinutes())+".json";
}
