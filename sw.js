/* ========================================
   하루메모 - Service Worker
   오프라인에서도 앱이 작동하도록 파일을 캐시
   ======================================== */

// 캐시 이름 (버전 변경 시 숫자 증가)
const CACHE_NAME = 'harumemo-v5';

// 캐시할 파일 목록
const CACHE_FILES = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/sw-register.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

/* ----------------------------------------
   install 이벤트
   - Service Worker 설치 시 파일들을 캐시에 저장
   ---------------------------------------- */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] 설치 중...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] 파일 캐싱 중...');
        return cache.addAll(CACHE_FILES);
      })
      .then(() => {
        console.log('[Service Worker] 설치 완료!');
        // 즉시 활성화
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] 캐싱 실패:', error);
      })
  );
});

/* ----------------------------------------
   activate 이벤트
   - 오래된 캐시 삭제
   ---------------------------------------- */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] 활성화 중...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // 현재 버전이 아닌 캐시 삭제
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] 오래된 캐시 삭제:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] 활성화 완료!');
        // 모든 클라이언트에 즉시 적용
        return self.clients.claim();
      })
  );
});

/* ----------------------------------------
   fetch 이벤트
   - 네트워크 요청 가로채기
   - 캐시 우선 전략: 캐시에 있으면 캐시 사용, 없으면 네트워크
   ---------------------------------------- */
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // 캐시에 있으면 캐시된 응답 반환
        if (cachedResponse) {
          return cachedResponse;
        }

        // 캐시에 없으면 네트워크 요청
        return fetch(event.request)
          .then((networkResponse) => {
            // 유효한 응답이면 캐시에 저장
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
            }
            return networkResponse;
          })
          .catch(() => {
            // 네트워크 실패 시 (오프라인)
            // HTML 요청이면 메인 페이지 반환
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
          });
      })
  );
});
