import {createBackup,backupFilename,parseBackup} from "./backup-core.mjs";
export function makeBackupFile(data,now=new Date()){
 return new File([JSON.stringify(createBackup(data,now),null,2)],backupFilename(now),{type:"application/json"});
}
export function downloadBackup(file){
 const url=URL.createObjectURL(file),link=document.createElement("a");
 link.href=url;link.download=file.name;document.body.append(link);
 try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
export async function readBackupFile(file){
 if(!file || file.size>25*1024*1024)throw new Error("Nieprawidłowy rozmiar kopii.");
 return parseBackup(await file.text());
}

export async function saveBackupWithPicker(file,picker=globalThis.showSaveFilePicker?.bind(globalThis)){
 if(typeof picker!=="function")throw new Error("Wybór miejsca zapisu niedostępny. Pobierz kopię JSON.");
 try{
  const handle=await picker({suggestedName:file.name,types:[{description:"Kopia zapasowa JSON",accept:{"application/json":[".json"]}}]});
  const writable=await handle.createWritable();
  try{await writable.write(file);await writable.close();}
  catch(error){await writable.abort().catch(()=>{});throw error;}
  return true;
 }catch(error){if(error?.name==="AbortError")return false;throw error;}
}
