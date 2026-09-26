/* VolleyTeam Manager (Coach) - Service Worker
   Aggiornamento silenzioso: il nuovo SW si scarica e resta in attesa; la pagina lo
   attiva (SKIP_WAITING) alla prossima apertura dell'app o se l'utente preme "Aggiorna ora".
   Mai skipWaiting automatico: nessun cambio di versione mentre l'app e' in uso.
   Bump CACHE_VERSION ad ogni rilascio. localStorage, IndexedDB e sessione non vengono mai toccati:
   si cancellano solo le cache di QUESTA app (prefisso volleyteam-). */
const CACHE_PREFIX = 'volleyteam-';
const CACHE_VERSION = 'volleyteam-v78';
const APP_SHELL = [
  './',
  './index.html',
  './app.js',
  './supabase.js',
  './soundkit.js',
  './schemes.js',
  './polisport.js',
  './marquee.js',
  './manifest.json',
  './icons/logo-badge.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

// Installazione: pre-cache dell'app shell scaricata dalla rete (non dalla cache HTTP),
// cosi' la versione in attesa e' completa. NON si attiva subito: aspetta la pagina.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(APP_SHELL.map((u) => new Request(u, { cache: 'reload' })))
    )
  );
});

// Attivazione: pulizia delle cache vecchie e presa di controllo
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// La pagina chiede di applicare l'aggiornamento in attesa
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Fetch: same-origin cache-first (offline), CDN stale-while-revalidate
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (sameOrigin) {
    event.respondWith(
      caches.match(req).then((cached) =>
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          return res;
        }).catch(() => caches.match('./index.html'))
      )
    );
  } else {
    event.respondWith(
      caches.open(CACHE_VERSION).then((cache) =>
        cache.match(req).then((cached) => {
          const network = fetch(req).then((res) => {
            cache.put(req, res.clone());
            return res;
          }).catch(() => cached);
          return cached || network;
        })
      )
    );
  }
});
