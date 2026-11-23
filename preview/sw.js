/* Isolated staging service worker. Scope: /moja-silownia/preview/ only. */
const CACHE='moja-silownia-preview-shell-v201-recovery-guardrails-20261123-atlas-p1-anatomy-v3';
const ASSETS=["./profile-core.js?v=190","./profile-ui.js?v=190","./profile.css?v=190","../icon.svg","../styles/app-base.css?v=1","../styles/progress-inline.css?v=1","./","./index.html","../manifest.webmanifest","../icon-192.png?v=1.6.12","../icon-512.png?v=1.6.12","../icon-maskable-512.png?v=1.6.12","../ui-enhancements.css?v=164","../dashboard-cyan.css?v=1","../assistant/assistant.css?v=1","../assistant/assistant-progression.css?v=1","../sport-performance.css?v=169","../muscle-fatigue-core.js?v=1","../warmup-sets.css?v=1","../mobile-theme-fix.css?v=1","../summary.css?v=1","../trainer-plans-library.js?v=1","./plan-importer.js?v=181","../ui-enhancements.js?v=161","../dashboard-cyan-core.js?v=1","../dashboard-cyan-ui.js?v=3","../assistant/assistant-core.js?v=2","../assistant/assistant-ui.js?v=1","./assistant/session-mode.js?v=201","./assistant/assistant-core.js?v=201","./assistant/assistant-progression.js?v=202","./assistant/equipment-settings-ui.js?v=200","./assistant/assistant-progression-ui.js?v=200","../summary-core.js?v=1","../summary-export.js?v=1","../summary-ui.js?v=1","../progress-core-v2.js?v=3","../progress-ui-v2.js?v=3","../calisthenics-library.js?v=1","../calisthenics-icons.js?v=2","../exercise-catalog-shared.js?v=1","../modules/bootstrap.js?v=1","../modules/exercise-notes.js?v=180","../modules/exercise-notes-ui.js?v=180","../modules/records.js","../modules/storage.js","../modules/state-core.js","../modules/state-storage.js","../modules/workout-png.js?v=1","../modules/rest-audio.js?v=1","./workout-selectors.js?v=183","./muscle-anatomy-art.js?v=3","./muscle-atlas-core.js?v=1","./muscle-atlas-ui.js?v=3","./muscle-atlas.css?v=3"];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>Promise.all(ASSETS.map(asset=>cache.add(asset)))).catch(async error=>{await caches.delete(CACHE);throw error;}));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('moja-silownia-preview-shell-')&&k!==CACHE).map(k=>caches.delete(k)))));
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 const url=new URL(req.url);
 const appRoot=new URL('../',self.registration.scope).pathname;
 if(!url.pathname.startsWith(appRoot))return;
 if(req.mode==='navigate'){
  if(!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
  event.respondWith(fetch(req).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put('./index.html',copy)).catch(()=>{}));}return response}).catch(async()=>await (await caches.open(CACHE)).match('./index.html')||Response.error()));
  return;
 }
 event.respondWith(caches.open(CACHE).then(cache=>cache.match(req)).then(cached=>cached||fetch(req).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{}));}return response})));
});
