// Ironclad Duel offline helper.
// The game page is fetched fresh whenever there is a connection (so updates arrive straight away)
// and the last good copy is kept for offline play. Fonts and the sign-in library are cached as they load.
const CACHE='ironclad-v2';
const CORE=['./','./play.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const url=new URL(req.url);
  // never cache sign-in or the cloud save traffic
  if(/googleapis\.com$|firebaseio\.com$|firebaseapp\.com$|identitytoolkit|securetoken/.test(url.hostname)&&!/fonts\.googleapis\.com$/.test(url.hostname))return;
  if(url.origin===location.origin&&url.searchParams.has('vchk'))return; // the update checker must always ask the network
  if(req.mode==='navigate'||(url.origin===location.origin&&/(\/|\.html)$/.test(url.pathname))){
    // pages (the website and the game): network first, fall back to the saved copy when offline
    const key=url.origin+url.pathname;
    e.respondWith(fetch(req,{cache:'no-store'}).then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(key,cp));}return r;}).catch(()=>caches.match(key).then(r=>r||caches.match('./play.html'))));
    return;}
  if(/\.mp4$/.test(url.pathname))return; // the trailer streams straight from the site
  if(url.origin===location.origin&&url.searchParams.has('vchk'))return; // the update checker must always ask the network
  // everything else (fonts, icons, libraries): cached copy first, refreshed in the background
  e.respondWith(caches.match(req).then(hit=>{const net=fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque')){const cp=r.clone();caches.open(CACHE).then(c=>c.put(req,cp));}return r;}).catch(()=>hit);return hit||net;}));
});
