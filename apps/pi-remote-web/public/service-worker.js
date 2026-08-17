// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote PWA Service Worker
// ───────────────────────────────────────────────────────────────────

const CACHE_NAME = 'pi-remote-shell-v4';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg'];
const SHELL_PATHS = new Set(SHELL);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isArtifactRequest(url)) {
    // Artifact bytes are authenticated, revision-specific data. They must never
    // become durable shell or runtime cache entries.
    event.respondWith(fetchWithoutBrowserCache(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetchWithoutBrowserCache(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }

  if (!isShellRequest(url)) {
    event.respondWith(fetchWithoutBrowserCache(request));
    return;
  }

  event.respondWith(
    caches.match(url.pathname).then(
      (cached) =>
        cached ??
        fetchWithoutBrowserCache(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(url.pathname, copy));
          }
          return response;
        }),
    ),
  );
});

function isShellRequest(url) {
  return (
    SHELL_PATHS.has(url.pathname) ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/fonts/')
  );
}

function isArtifactRequest(url) {
  return /^\/api\/sessions\/[^/]+\/artifacts\/[^/]+\/revisions\/[^/]+$/.test(url.pathname);
}

function fetchWithoutBrowserCache(request) {
  return fetch(new Request(request, { cache: 'no-store' }));
}

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let hint;
      try {
        hint = event.data?.json();
      } catch {
        return;
      }
      if (!isHint(hint)) return;
      await self.registration.showNotification(notificationTitle(hint.attentionClass), {
        body: 'Open Pi Remote to fetch current state.',
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: `attention-${hint.lookupId}`,
        data: { lookupId: hint.lookupId },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const lookupId = event.notification.data?.lookupId;
  if (typeof lookupId !== 'string') return;
  event.waitUntil(
    (async () => {
      const path = `/attention/${encodeURIComponent(lookupId)}`;
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = clients[0];
      if (existing !== undefined) {
        await existing.navigate(path);
        return existing.focus();
      }
      return self.clients.openWindow(path);
    })(),
  );
});

function isHint(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    Object.keys(value).length === 2 &&
    typeof value.lookupId === 'string' &&
    /^[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/.test(value.lookupId) &&
    ['needs_input', 'finished', 'error'].includes(value.attentionClass)
  );
}

function notificationTitle(attentionClass) {
  if (attentionClass === 'needs_input') return 'Pi Remote needs input';
  if (attentionClass === 'finished') return 'Pi Remote finished';
  return 'Pi Remote needs attention';
}
