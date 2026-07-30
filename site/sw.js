const VERSION = 'v1';
const SHELL = `shell-${VERSION}`;
const MEDIA = `media-${VERSION}`;

const SHELL_ASSETS = [
  './',
  'index.html',
  'css/app.css',
  'js/main.js',
  'js/frames.js',
  'js/gate.js',
  'js/reveal.js',
  'js/audio.js',
  'content/story.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== SHELL && key !== MEDIA).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isMedia = url.pathname.includes('/media/');

  // Media: cache-first and permanent — it never changes once converted.
  if (isMedia) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((response) => {
        // Range requests for video come back as 206 and must not be cached.
        if (response.ok && response.status === 200) {
          const copy = response.clone();
          caches.open(MEDIA).then((cache) => cache.put(request, copy));
        }
        return response;
      }))
    );
    return;
  }

  // Shell: network-first so edits show up during development, cache as fallback.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(SHELL).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
