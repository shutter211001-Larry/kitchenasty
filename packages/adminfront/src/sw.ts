/// <reference lib="webworker" />
declare let self: ServiceWorkerGlobalScope;

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Take control of all pages immediately
self.skipWaiting();
clientsClaim();

// Precache static assets injected by Vite
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

// 1. Caching API GET Requests (Offline Fallback for Menus/Settings)
// Cache /api/ GET requests using StaleWhileRevalidate
registerRoute(
  ({ request, url }) => url.pathname.startsWith('/api/') && request.method === 'GET',
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
  })
);

// 2. Background Sync for POST/PUT/PATCH (Ghost Mode)
// When offline, queue mutating requests (Orders, Attendance) to IndexedDB
const bgSyncPlugin = new BackgroundSyncPlugin('offline-mutations-queue', {
  maxRetentionTime: 24 * 60, // Retry for up to 24 hours
  onSync: async ({ queue }) => {
    console.log('Background Sync triggered. Replaying requests...');
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        console.log('Replaying request:', entry.request.url);
        await fetch(entry.request.clone());
      } catch (error) {
        console.error('Replay failed, putting back to queue', error);
        await queue.unshiftRequest(entry);
        throw error; // Stop replaying and wait for next sync event
      }
    }
  },
});

registerRoute(
  ({ request, url }) => url.pathname.startsWith('/api/') && ['POST', 'PUT', 'PATCH'].includes(request.method),
  new NetworkFirst({
    plugins: [bgSyncPlugin],
  })
);

// 3. App Shell routing
// Navigation fallback for SPA
registerRoute(
  new NavigationRoute(async () => {
    try {
      const response = await caches.match('/index.html');
      if (response) return response;
      return fetch('/index.html');
    } catch (e) {
      return new Response('Network error', { status: 408 });
    }
  })
);
