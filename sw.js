const CACHE_NAME = "n-song-sort-v1";
const urlsToCache = [
  "index.html",
  "https://unpkg.com/vue@3/dist/vue.global.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
