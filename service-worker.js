/* Bangkok Guide: same-origin app shell cache. No private GitHub API requests are cached. */
const CACHE = 'bangkok-guide-shell-v12';
const OFFLINE_FILES = ['./index.html', './app.js', './catalog.js', './places.json', './map.js', './map.css', './vendor/leaflet.js', './vendor/leaflet.css', './manifest.webmanifest', './pwa.js', './apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(OFFLINE_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('bangkok-guide-shell-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({type:'window'}))
      .then(clients => Promise.all(clients.map(client => client.navigate(client.url).catch(() => null))))
  );
});
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  if (url.pathname.endsWith('/updates.json') || url.pathname.endsWith('/places.json')) {
    event.respondWith(fetch(req).then(resp => {
      if (resp.ok) { const copy=resp.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(req, copy))); }
      return resp;
    }).catch(() => caches.match(req).then(cached => cached || Response.json({version:1,items:[]}, {headers:{'Content-Type':'application/json'}}))));
    return;
  }
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(resp => {
      if (resp.ok && url.pathname === new URL(self.registration.scope).pathname) {
        const copy=resp.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put('./index.html', copy)));
      }
      return resp;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  if (/\/(?:icons\/icon-(?:192|512)\.png|apple-touch-icon\.png|manifest\.webmanifest|pwa\.js|service-worker\.js|app\.js|catalog\.js|map\.(?:js|css)|vendor\/leaflet\.(?:js|css))$/.test(url.pathname)) {
    event.respondWith(caches.match(req).then(cached => cached || fetch(req)));
  }
});
