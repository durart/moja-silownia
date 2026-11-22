/* Moja Siłownia — versioned app-shell cache. User workout data stays in localStorage. */
const CACHE='moja-silownia-shell-v34-progression-1.8.0-20261122';
const ASSETS=['./styles/app-base.css?v=1','./styles/progress-inline.css?v=1','./','./index.html','./manifest.webmanifest?v=1.6.12','./icon-192.png?v=1.6.12','./icon-192.png?v=1.6.12','./icon-512.png?v=1.6.12','./icon-maskable-512.png?v=1.6.12','./ui-enhancements.css?v=164','./dashboard-cyan.css?v=1','./assistant/assistant.css?v=1','./assistant/assistant-progression.css?v=1','./sport-performance.css?v=169','./muscle-fatigue-core.js?v=1','./warmup-sets.css?v=1','./mobile-theme-fix.css?v=1','./summary.css?v=1','./trainer-plans-library.js?v=1','./plan-importer.js?v=162','./ui-enhancements.js?v=161','./dashboard-cyan-core.js?v=1','./dashboard-cyan-ui.js?v=3','./assistant/assistant-core.js?v=2','./assistant/assistant-ui.js?v=1','./assistant/assistant-progression.js?v=180','./assistant/assistant-progression-ui.js?v=180','./summary-core.js?v=1','./summary-export.js?v=1','./summary-ui.js?v=1','./progress-core-v2.js?v=3','./progress-ui-v2.js?v=3','./calisthenics-library.js?v=1','./calisthenics-icons.js?v=2','./exercise-catalog-shared.js?v=1','./modules/bootstrap.js?v=1','./modules/exercise-notes.js?v=180','./modules/exercise-notes-ui.js?v=180','./modules/records.js','./modules/storage.js','./modules/state-core.js','./modules/state-storage.js','./modules/workout-png.js?v=1','./modules/rest-audio.js?v=1','./modules/workout-selectors.js?v=1'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>Promise.all(ASSETS.map(asset=>cache.add(asset)))).then(()=>self.skipWaiting()));
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
