export function createGoogleAuth(clientId,gis=globalThis.google?.accounts?.oauth2){
 if(!gis || !/^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId))throw new Error("Brak konfiguracji Google OAuth.");
 let token=null,expiresAt=0,pending=null;
 function getToken(){
  if(token && Date.now()<expiresAt)return Promise.resolve(token);
  if(pending)return pending;
  pending=new Promise((resolve,reject)=>{
   const client=gis.initTokenClient({client_id:clientId,scope:"https://www.googleapis.com/auth/drive.file",callback:response=>{
    if(response.error || !response.access_token){reject(new Error("Nie udało się autoryzować Dysku Google."));return;}
    token=response.access_token;expiresAt=Date.now()+Math.max(0,Number(response.expires_in)-60)*1000;resolve(token);
   },error_callback:()=>reject(new Error("Przerwano autoryzację Google."))});
   client.requestAccessToken({prompt:""});
  }).finally(()=>{pending=null;});
  return pending;
 }
 function clear(){token=null;expiresAt=0;}
 return Object.freeze({getToken,clear});
}
