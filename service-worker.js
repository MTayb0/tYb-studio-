const CACHE_NAME = 'tyb-studio-shell-v17';
const MODULE_CACHE = 'tyb-studio-modules-v1';
const APP_FILES = ['./','./index.html','./styles.css','./app.js','./creator-tools.js','./advanced-tools.js','./creative-studio.js','./video-editor.js','./social-creator.js','./film-studio.js','./tayab-video-call.js','./studio-tools.js','./pro-lab.js','./ai-builder.js','./tayab.js','./tayab-growth.js','./module-loader.js','./timeline-pro.js','./audio-lab.js','./ai-lab.js','./module-registry.json','./manifest.webmanifest'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('tyb-studio-shell-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const shellCache = await caches.open(CACHE_NAME);
    const moduleCache = await caches.open(MODULE_CACHE);
    const isRegistry = url.pathname.endsWith('/module-registry.json');
    // Registry is network-first so Check for Updates can actually discover a new release.
    if (isRegistry) {
      try {
        const response = await fetch(event.request);
        if (response && response.ok) await moduleCache.put(event.request, response.clone());
        return response;
      } catch (error) {
        const cachedRegistry = await moduleCache.match(event.request) || await shellCache.match(event.request);
        if (cachedRegistry) return cachedRegistry;
        throw error;
      }
    }
    const cached = await shellCache.match(event.request) || await moduleCache.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response && response.ok) {
        const targetCache = url.pathname.includes('/modules/') ? MODULE_CACHE : CACHE_NAME;
        await (await caches.open(targetCache)).put(event.request, response.clone());
      }
      return response;
    } catch (error) {
      const moduleHit = await moduleCache.match(event.request);
      if (moduleHit) return moduleHit;
      const fallback = await shellCache.match('./index.html');
      if (fallback) return fallback;
      throw error;
    }
  })());
});
