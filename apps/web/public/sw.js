/*
 * Service worker mínimo para o PWA.
 *
 * Importante: o PROCESSAMENTO dos vídeos acontece no SERVIDOR (worker), então
 * NÃO dependemos deste service worker para processar nada. Ele serve apenas
 * para permitir "adicionar à tela inicial" e um cache básico do app shell.
 *
 * NÃO cacheamos chamadas de API nem o Supabase (dados sempre atualizados).
 */
const CACHE = 'editor-videos-v1';
const APP_SHELL = ['/', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Nunca interferir em métodos que não GET, APIs, auth ou Supabase.
  if (
    request.method !== 'GET' ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/auth') ||
    url.hostname.endsWith('supabase.co')
  ) {
    return;
  }

  // Navegações: rede primeiro, cai para cache offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/').then((r) => r || Response.error())),
    );
    return;
  }

  // Estáticos: cache primeiro.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request)),
  );
});

// Estrutura preparada para notificações push (não obrigatória no MVP).
self.addEventListener('push', (event) => {
  let payload = { title: 'Editor de Vídeos', body: 'Atualização do seu lote.' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (_) {
    /* ignore */
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    }),
  );
});
