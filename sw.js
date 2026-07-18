/* Service worker — chemins RELATIFS (sous-dossier github.io compatible) */
const VERSION = "devises-v3";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  const isRates = /jsdelivr\.net|currency-api\.pages\.dev/.test(url.host);
  const isFlag = /flagcdn\.com/.test(url.host);

  if (isRates) {
    // Taux : réseau d'abord, cache en secours (voyage hors-ligne)
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  if (isFlag) {
    // Drapeaux : ne changent jamais, cache d'abord
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy));
        return res;
      }))
    );
    return;
  }

  // App shell : cache d'abord
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request))
  );
});
