const API="https://www.googleapis.com/drive/v3";
const UPLOAD="https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime";
const MARKER="moja-silownia-backup-v1";
export function createDriveClient(getToken,fetcher=globalThis.fetch){
 async function request(url,options={}){
  const token=await getToken();
  const response=await fetcher(url,{...options,cache:"no-store",credentials:"omit",redirect:"error",headers:{...options.headers,Authorization:"Bearer "+token}});
  if(!response.ok)throw new Error("Błąd Dysku Google ("+response.status+").");
  return response;
 }
 async function upload(file){
  const boundary=crypto.randomUUID();
  const metadata={name:file.name,mimeType:"application/json",appProperties:{backup:MARKER}};
  const body=new Blob(["--"+boundary+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n",JSON.stringify(metadata),"\r\n--"+boundary+"\r\nContent-Type: application/json\r\n\r\n",file,"\r\n--"+boundary+"--\r\n"]);
  return (await request(UPLOAD,{method:"POST",headers:{"Content-Type":"multipart/related; boundary="+boundary},body})).json();
 }
 async function list(){
  const files=[];let pageToken;
  do{
   const params=new URLSearchParams({q:"trashed = false and appProperties has { key='backup' and value='"+MARKER+"' }",fields:"nextPageToken,files(id,name,createdTime,size)",orderBy:"createdTime desc",pageSize:"100"});
   if(pageToken)params.set("pageToken",pageToken);
   const page=await (await request(API+"/files?"+params)).json();
   files.push(...(page.files??[]));pageToken=page.nextPageToken;
  }while(pageToken);
  return files;
 }
 async function download(id){
  if(!/^[a-zA-Z0-9_-]+$/.test(id))throw new Error("Nieprawidłowy identyfikator pliku.");
  const response=await request(API+"/files/"+encodeURIComponent(id)+"?alt=media");
  const blob=await response.blob();
  if(blob.size>25*1024*1024)throw new Error("Kopia jest zbyt duża.");
  return blob.text();
 }
 return Object.freeze({upload,list,download});
}
