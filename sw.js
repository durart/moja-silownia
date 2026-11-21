/* Moja Siłownia — versioned app-shell cache. User workout data stays in localStorage. */
const CACHE='moja-silownia-shell-v3-progress2-20261121';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg','./ui-enhancements.css?v=163','./sport-performance.css?v=169','./summary.css?v=1','./plan-importer.js?v=162','./ui-enhancements.js?v=160','./summary-core.js?v=1','./summary-export.js?v=1','./summary-ui.js?v=1','./progress-core-v2.js?v=2','./progress-ui-v2.js?v=2'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(ASSETS.map(asset=>cache.add(asset)))));
 self.skipWaiting();
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('moja-silownia-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 const url=new URL(req.url);
 if(!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 if(req.mode==='navigate'){
  event.respondWith(fetch(req).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',copy)).catch(()=>{});}return response}).catch(async()=>await caches.match('./index.html')||Response.error()));
  return;
 }
 event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{});}return response})));
});
