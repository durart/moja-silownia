/* Service Worker tylko dla /preview/ — nie steruje główną aplikacją */
const CACHE_NAME='moja-silownia-preview-v163-20261116';
const CACHE_PREFIX='moja-silownia-preview-v';
const APP_SHELL=[
 './',
 './index.html',
 '../ui-enhancements.css?v=160',
 '../ui-enhancements.js?v=160',
 '../plan-importer.js?v=160',
 '../assets/all-exercise-thumbnails.webp',
 '../assets/muscle-tiles.avif',
 '../assets/chest-thumbnails.webp',
 '../icon.svg'
];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE_NAME);
  await cache.addAll(APP_SHELL);
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin)return;
 const scopePath=new URL(self.registration.scope).pathname;
 if(request.mode==='navigate' && url.pathname.startsWith(scopePath)){
  event.respondWith((async()=>{
   try {
    const response=await fetch(request);
    if(response.ok){
     const clone=response.clone();
     event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.put('./index.html',clone)));
    }
    return response;
   }catch{
    return (await caches.match('./index.html'))||(await caches.match('./'))||Response.error();
   }
  })());
  return;
 }
 event.respondWith((async()=>{
  const cached=await caches.match(request,{ignoreSearch:true});
  if(cached)return cached;
  return fetch(request);
 })());
});
