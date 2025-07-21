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
                // If not in cache, try to fetch from network
                return fetch(event.request)
                    .then(networkResponse => {
                        // IMPORTANT: Clone the response BEFORE consuming it for caching
                        let responseToCache = networkResponse.clone();

                        if (networkResponse.ok && networkResponse.type === 'basic') {
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, responseToCache); // Use the cloned response for caching
                            });
                        }
                        return networkResponse; // Return the original response to the browser
                    })
                    .catch(() => {
                        // If network fetch fails (e.g., offline), and not in cache,
                        // return a generic offline response.
                        console.warn('Fetch failed for:', event.request.url, 'Returning generic offline response.');
                        // Return a generic offline response for any failed fetch
                        return new Response('<h1>Offline</h1><p>Anda sedang offline. Data yang ditampilkan mungkin tidak terbaru.</p>', {
                            headers: { 'Content-Type': 'text/html' }
                        });
                    });
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
