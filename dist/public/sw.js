/**
 * Service Worker para PWA - Controle de Estoque
 * 
 * Estratégia: Cache-first para assets estáticos, network-first para APIs
 * Permite funcionamento básico offline e sincronização quando conexão retorna
 */

const CACHE_NAME = 'controle-estoque-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
];

// Cache de assets estáticos durante instalação
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.log('Erro ao cachear assets estáticos:', err);
      });
    })
  );
  self.skipWaiting();
});

// Limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estratégia de cache e network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Não interceptar requisições que não sejam GET (POST/PATCH/PUT/DELETE)
  // para evitar que o Service Worker bloqueie headers Set-Cookie ou que
  // respostas de mutação sejam convertidas incorretamente.
  if (request.method !== 'GET') {
    return;
  }

  // APIs: network-first (tenta network primeiro, fallback para cache)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache a resposta bem-sucedida
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Se falhar, tenta cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Se não tiver cache, retorna offline page ou erro genérico
            return new Response(
              JSON.stringify({ error: 'Sem conexão. Tente novamente quando a rede estiver disponível.' }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' },
              }
            );
          });
        })
    );
    return;
  }

  // Assets estáticos: cache-first (usa cache se disponível)
  if (
    request.method === 'GET' &&
    (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/) ||
      url.pathname === '/' ||
      url.pathname === '/index.html')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        return (
          cachedResponse ||
          fetch(request).then((response) => {
            // Não cachear respostas de erro
            if (!response || response.status !== 200) {
              return response;
            }

            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });

            return response;
          })
        );
      })
    );
    return;
  }

  // Outros requests: network-first
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});

// Background Sync (sincronização quando conexão retorna)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-alimentos') {
    event.waitUntil(
      // Aqui você pode re-enviar dados que ficaram pendentes
      fetch('/api/alimentos', {
        method: 'GET',
        credentials: 'include',
      }).catch(err => {
        console.log('Erro ao sincronizar alimentos:', err);
      })
    );
  }
});

// Notificações Push (opcional para futuro)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Controle de Estoque';
  const options = {
    body: data.body || 'Nova notificação',
    icon: '/icon-192.png',
    badge: '/favicon.png',
    tag: 'notification',
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});
