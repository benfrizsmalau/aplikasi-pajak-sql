const CACHE_NAME = 'pajak-app-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/tambah-data.html',
    '/lihat-data.html',
    '/tambah-ketetapan.html',
    '/daftar-ketetapan.html',
    '/setoran-pajak.html',
    '/daftar-pembayaran.html',
    '/daftar-fiskal.html',
    '/report.html',
    '/target.html',
    '/detail.html',
    '/images/logo.png',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://unpkg.com/dexie@latest/dist/dexie.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
