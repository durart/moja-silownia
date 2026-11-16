/* Wycofany tryb offline w wersji testowej. */
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();
 await Promise.all(keys.filter(k=>k.startsWith('moja-silownia-preview-v')).map(k=>caches.delete(k)));
 await self.registration.unregister();
 await self.clients.claim();
})()));
