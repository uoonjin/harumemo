/* ========================================
   하루메모 - Service Worker 등록
   ======================================== */

// 브라우저가 Service Worker를 지원하는지 확인 후 등록
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[SW 등록] 성공:', registration.scope);

        // 새 Service Worker가 대기 중일 때
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('[SW 등록] 새 버전 발견, 설치 중...');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('[SW 등록] 새 버전 준비 완료. 새로고침하면 적용됩니다.');
              } else {
                console.log('[SW 등록] 오프라인 사용 준비 완료!');
              }
            }
          });
        });
      })
      .catch((error) => {
        console.error('[SW 등록] 실패:', error);
      });
  });
} else {
  console.log('[SW 등록] 이 브라우저는 Service Worker를 지원하지 않습니다.');
}
