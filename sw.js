const CACHE_NAME = 'mtbc-tracker-cache-v1.1'; // 앱 버전 변경 시 함께 수정 권장
const urlsToCache = [
  '/', // 루트 경로 (index.html)
  'index.html',
  'style.css',
  'script.js',
  'assets/title.svg', // 사용된 이미지 경로
  'manifest.json',
  // CDN 리소스 (오프라인 지원 강화)
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/moment@2.30.1/moment.min.js',
  'https://cdn.jsdelivr.net/npm/moment@2.30.1/locale/ko.js'
  // 필요한 다른 정적 에셋(아이콘 등) 경로 추가
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
];

// 1. 서비스 워커 설치 및 캐싱
self.addEventListener('install', event => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Opened cache');
        // 필수 코어 파일 캐싱 시도
        return cache.addAll(urlsToCache)
                 .catch(error => {
                    console.error('[Service Worker] Failed to cache core assets:', error);
                    // 하나라도 실패하면 설치 실패로 간주하지 않으려면 에러 처리 조정 가능
                 });
      })
      .then(() => {
        console.log('[Service Worker] Core assets cached successfully');
        return self.skipWaiting(); // 새 서비스 워커 즉시 활성화 (선택 사항)
      })
  );
});

// 2. 서비스 워커 활성화 및 오래된 캐시 정리
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) { // 현재 캐시 이름과 다른 캐시는 삭제
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('[Service Worker] Old caches cleaned');
        return self.clients.claim(); // 활성화된 서비스워커가 즉시 제어권을 갖도록 함
    })
  );
});

// 3. 네트워크 요청 가로채기 (Fetch 이벤트) - Cache First 전략
self.addEventListener('fetch', event => {
  // GET 요청만 처리
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request) // 먼저 캐시에서 찾아봄
      .then(cachedResponse => {
        if (cachedResponse) {
          // 캐시에 있으면 캐시된 응답 반환
          // console.log('[Service Worker] Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // 캐시에 없으면 네트워크로 요청
        // console.log('[Service Worker] Fetching from network:', event.request.url);
        return fetch(event.request).then(
          networkResponse => {
            // 네트워크 응답이 유효하면
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse; // 유효하지 않으면 그대로 반환
            }

            // 응답을 복제하여 하나는 캐시에 저장하고, 하나는 브라우저에 전달
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache); // 캐시에 저장
              });

            return networkResponse; // 원래 응답 반환
          }
        ).catch(error => {
          console.error('[Service Worker] Fetch failed:', error);
          // 네트워크 실패 시 대체 응답 제공 가능 (예: 오프라인 페이지)
          // return caches.match('/offline.html'); // 오프라인 페이지 경로 예시
        });
      })
  );
});