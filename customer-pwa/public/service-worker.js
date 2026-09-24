const CACHE_NAME = 'pharmalink-v3'

const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/pharmalink-icon-192.png',
  '/pharmalink-icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  )

  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  )

  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const request = event.request

  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)

  // Never intercept requests to another origin.
  // This is especially important for the PharmaLink backend
  // and Supabase authenticated requests.
  if (url.origin !== self.location.origin) {
    return
  }

  // Navigation requests should always try the network first.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/')),
    )
    return
  }

  // Cache only static frontend assets.
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/pharmalink-icon-192.png' ||
    url.pathname === '/pharmalink-icon-512.png'

  if (!isStaticAsset) {
    return
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200) {
          return response
        }

        const copy = response.clone()

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, copy)
        })

        return response
      })
    }),
  )
})