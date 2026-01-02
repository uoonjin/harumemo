/* ========================================
   하루메모 - 메인 앱 스크립트
   ======================================== */

'use strict';

/* ========================================
   상수
   ======================================== */
const STORAGE_KEY = 'harumemo_data';
const TEXT_SIZE_KEY = 'harumemo_textsize';
const DARKMODE_KEY = 'harumemo_darkmode';

/* ========================================
   전역 변수
   ======================================== */
// 현재 표시 중인 년/월
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0-11

// 현재 선택된 날짜
let selectedDate = null;

// 메모 데이터 (메모리)
let memos = {};

// 현재 텍스트 크기 (small, medium, large)
let currentTextSize = 'medium';

// 현재 메모의 이미지 배열
let currentImages = [];

// 그리기 관련 변수
let isDrawing = false;
let drawCtx = null;
let currentColor = '#333333';
let isEraser = false;

// 다크모드 상태
let isDarkMode = false;

/* ========================================
   DOM 요소
   ======================================== */
const mainScreen = document.getElementById('main-screen');
const memoScreen = document.getElementById('memo-screen');
const monthTitle = document.getElementById('month-title');
const calendarGrid = document.getElementById('calendar-grid');
const memoTextarea = document.getElementById('memo-textarea');

// 버튼
const btnNewMemo = document.getElementById('btn-new-memo');
const btnBack = document.getElementById('btn-back');
const btnSave = document.getElementById('btn-save');
const btnClose = document.getElementById('btn-close');

// 툴바 버튼
const btnText = document.getElementById('btn-text');
const btnChecklist = document.getElementById('btn-checklist');
const btnAttach = document.getElementById('btn-attach');
const btnDraw = document.getElementById('btn-draw');
const textSizePopup = document.getElementById('text-size-popup');

// 이미지 관련
const imageFileInput = document.getElementById('image-file-input');
const imagePreviewContainer = document.getElementById('image-preview-container');

// 그리기 화면
const drawScreen = document.getElementById('draw-screen');
const drawCanvas = document.getElementById('draw-canvas');
const btnDrawCancel = document.getElementById('btn-draw-cancel');
const btnDrawSave = document.getElementById('btn-draw-save');
const btnEraser = document.getElementById('btn-eraser');
const btnClearCanvas = document.getElementById('btn-clear-canvas');

// 상세보기 화면
const detailScreen = document.getElementById('detail-screen');

// 더보기 메뉴
const moreMenu = document.getElementById('more-menu');

/* ========================================
   LocalStorage 함수
   ======================================== */
// 메모 데이터 저장
function saveMemos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
}

// 메모 데이터 불러오기
function loadMemos() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    memos = JSON.parse(data);
  }
}

/* ========================================
   CRUD 함수
   ======================================== */
// Create/Update: 메모 저장
function saveMemo(date, content) {
  // 내용과 이미지가 모두 비어있으면 메모 삭제
  if (!content.trim() && currentImages.length === 0) {
    deleteMemo(date);
    return;
  }

  const now = new Date().toISOString();

  if (memos[date]) {
    // Update: 기존 메모 수정
    memos[date].content = content;
    memos[date].images = currentImages;
    memos[date].updatedAt = now;
  } else {
    // Create: 새 메모 생성
    memos[date] = {
      id: date, // 날짜를 ID로 사용
      content: content,
      images: currentImages,
      emoji: '',
      createdAt: now,
      updatedAt: now
    };
  }

  saveMemos();
}

// Read: 특정 날짜의 메모 읽기
function getMemo(date) {
  return memos[date] || null;
}

// Delete: 메모 삭제
function deleteMemo(date) {
  if (memos[date]) {
    delete memos[date];
    saveMemos();
  }
}

// 해당 월의 메모가 있는 날짜 목록
function getMemoDatesInMonth(year, month) {
  const dates = [];
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;

  for (const date in memos) {
    if (date.startsWith(prefix)) {
      dates.push(parseInt(date.split('-')[2]));
    }
  }

  return dates;
}

/* ========================================
   화면 전환 함수
   ======================================== */
// 메인 화면 표시
function showMainScreen() {
  memoScreen.classList.remove('active');
  mainScreen.classList.add('active');
  renderCalendar(); // 달력 새로고침 (메모 표시 업데이트)
}

// 메모 화면 표시
function showMemoScreen() {
  mainScreen.classList.remove('active');
  memoScreen.classList.add('active');
  memoTextarea.focus();
}

/* ========================================
   스와이프 이벤트 함수
   ======================================== */
let touchStartX = 0;
let touchEndX = 0;
const SWIPE_THRESHOLD = 50; // 스와이프 인식 최소 거리

// 스와이프 이벤트 초기화
function initSwipeEvents() {
  const calendarContainer = document.querySelector('.calendar-container');

  if (!calendarContainer) return;

  calendarContainer.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  calendarContainer.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });
}

// 스와이프 처리
function handleSwipe() {
  const swipeDistance = touchEndX - touchStartX;

  if (Math.abs(swipeDistance) < SWIPE_THRESHOLD) return;

  if (swipeDistance > 0) {
    // 오른쪽으로 스와이프 → 이전 달
    goToPrevMonth();
  } else {
    // 왼쪽으로 스와이프 → 다음 달
    goToNextMonth();
  }
}

/* ========================================
   달력 렌더링 함수
   ======================================== */
// 이전 달로 이동
function goToPrevMonth() {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar();
}

// 다음 달로 이동
function goToNextMonth() {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
}

// 달력 생성
function renderCalendar() {
  // 월 제목 업데이트 (년도 포함)
  monthTitle.textContent = `${currentYear}년 ${currentMonth + 1}월`;

  // 달력 그리드 초기화
  calendarGrid.innerHTML = '';

  // 해당 월의 첫 날과 마지막 날
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);

  // 첫 날의 요일 (월요일 시작: 0=월, 6=일)
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6; // 일요일인 경우

  // 오늘 날짜
  const today = new Date();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  // 메모가 있는 날짜 목록
  const memoDates = getMemoDatesInMonth(currentYear, currentMonth);

  // 빈 칸 추가 (첫 주)
  for (let i = 0; i < startDay; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'day-item empty';
    calendarGrid.appendChild(emptyDay);
  }

  // 날짜 추가
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dayItem = document.createElement('div');
    dayItem.className = 'day-item';

    // 오늘 날짜 표시
    if (day === todayDate && currentMonth === todayMonth && currentYear === todayYear) {
      dayItem.classList.add('today');
    }

    // 메모가 있는 날짜 표시
    if (memoDates.includes(day)) {
      dayItem.classList.add('has-memo');
    }

    // 날짜 번호
    const dayNumber = document.createElement('span');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;

    // 이모지 (메모가 있으면 표시)
    const dayEmoji = document.createElement('span');
    dayEmoji.className = 'day-emoji';

    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const memo = getMemo(dateStr);
    if (memo && memo.emoji) {
      dayEmoji.textContent = memo.emoji;
    }

    dayItem.appendChild(dayNumber);
    dayItem.appendChild(dayEmoji);

    // 날짜 클릭 이벤트
    dayItem.addEventListener('click', () => {
      selectedDate = dateStr;
      const clickedMemo = getMemo(dateStr);
      if (clickedMemo) {
        // 메모가 있으면 상세보기
        showDetailScreen(dateStr);
      } else {
        // 메모가 없으면 새 메모 작성
        openMemoForDate(selectedDate);
      }
    });

    calendarGrid.appendChild(dayItem);
  }
}

// 특정 날짜의 메모 열기
function openMemoForDate(date) {
  const memo = getMemo(date);

  if (memo) {
    // 기존 메모 불러오기
    memoTextarea.value = memo.content;
    currentImages = memo.images || [];
  } else {
    // 새 메모
    memoTextarea.value = '';
    currentImages = [];
  }

  // 이미지 미리보기 렌더링
  renderImagePreviews();

  showMemoScreen();
}

/* ========================================
   이벤트 리스너 등록
   ======================================== */
function initEventListeners() {
  // 툴바 버튼들이 포커스를 가져가지 않도록 설정 (키보드 유지)
  preventToolbarFocusLoss();

  // 월 이동 버튼
  const btnPrevMonth = document.getElementById('btn-prev-month');
  const btnNextMonth = document.getElementById('btn-next-month');

  if (btnPrevMonth) {
    btnPrevMonth.addEventListener('click', goToPrevMonth);
  }

  if (btnNextMonth) {
    btnNextMonth.addEventListener('click', goToNextMonth);
  }

  // 달력 스와이프 이벤트
  initSwipeEvents();

  // 새 메모 버튼
  if (btnNewMemo) {
    btnNewMemo.addEventListener('click', () => {
      closeMoreMenu();
      // 오늘 날짜로 새 메모 작성
      const today = new Date();
      selectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      openMemoForDate(selectedDate);
    });
  }

  // 뒤로가기 버튼
  btnBack.addEventListener('click', showMainScreen);

  // 닫기 버튼
  btnClose.addEventListener('click', showMainScreen);

  // 저장 버튼
  btnSave.addEventListener('click', () => {
    if (selectedDate) {
      saveMemo(selectedDate, memoTextarea.value);
    }
    showMainScreen();
  });

  // 텍스트 크기 버튼
  if (btnText) {
    btnText.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTextSizePopup();
    });
  }

  // 텍스트 크기 팝업 아이템 클릭
  if (textSizePopup) {
    textSizePopup.querySelectorAll('.popup-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const size = item.dataset.size;
        setTextSize(size);
        closeTextSizePopup();
      });
    });
  }

  // 체크리스트 버튼
  if (btnChecklist) {
    btnChecklist.addEventListener('click', () => {
      insertChecklist();
    });
  }

  // 메모 textarea 클릭 이벤트 (체크박스 토글용)
  if (memoTextarea) {
    memoTextarea.addEventListener('click', handleCheckboxClick);
  }

  // 첨부파일 버튼
  if (btnAttach) {
    btnAttach.addEventListener('click', () => {
      if (imageFileInput) {
        imageFileInput.click();
      }
    });
  }

  // 이미지 파일 선택
  if (imageFileInput) {
    imageFileInput.addEventListener('change', handleImageSelect);
  }

  // 그리기 버튼
  if (btnDraw) {
    btnDraw.addEventListener('click', () => {
      showDrawScreen();
    });
  }

  // 그리기 취소 버튼
  if (btnDrawCancel) {
    btnDrawCancel.addEventListener('click', () => {
      hideDrawScreen();
    });
  }

  // 그리기 저장 버튼
  if (btnDrawSave) {
    btnDrawSave.addEventListener('click', () => {
      saveDrawing();
    });
  }

  // 지우개 버튼
  if (btnEraser) {
    btnEraser.addEventListener('click', () => {
      toggleEraser();
    });
  }

  // 전체 지우기 버튼
  if (btnClearCanvas) {
    btnClearCanvas.addEventListener('click', () => {
      clearCanvas();
    });
  }

  // 색상 선택 버튼
  document.querySelectorAll('.color-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectColor(btn);
    });
  });

  // 팝업 외부 클릭 시 닫기
  document.addEventListener('click', (e) => {
    if (textSizePopup && btnText && !textSizePopup.contains(e.target) && e.target !== btnText) {
      closeTextSizePopup();
    }
    // 더보기 메뉴 외부 클릭 시 닫기
    const btnMore = document.getElementById('btn-more');
    if (moreMenu && btnMore && !moreMenu.contains(e.target) && e.target !== btnMore && !btnMore.contains(e.target)) {
      closeMoreMenu();
    }
  });

  // 더보기 메뉴 버튼
  const btnMore = document.getElementById('btn-more');
  if (btnMore) {
    btnMore.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMoreMenu();
    });
  }

  // 메모 내보내기 버튼
  const btnExport = document.getElementById('btn-export');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      exportMemos();
      closeMoreMenu();
    });
  }

  // 메모 가져오기 버튼
  const btnImport = document.getElementById('btn-import');
  if (btnImport) {
    btnImport.addEventListener('click', () => {
      openImportDialog();
      closeMoreMenu();
    });
  }

  // 다크모드 버튼
  const btnDarkmode = document.getElementById('btn-darkmode');
  if (btnDarkmode) {
    btnDarkmode.addEventListener('click', toggleDarkMode);
  }

  // 상세보기 뒤로가기 버튼
  const btnDetailBack = document.getElementById('btn-detail-back');
  if (btnDetailBack) {
    btnDetailBack.addEventListener('click', hideDetailScreen);
  }

  // 상세보기 수정 버튼
  const btnDetailEdit = document.getElementById('btn-detail-edit');
  if (btnDetailEdit) {
    btnDetailEdit.addEventListener('click', editFromDetail);
  }

  // 상세보기 공유 버튼
  const btnDetailShare = document.getElementById('btn-detail-share');
  if (btnDetailShare) {
    btnDetailShare.addEventListener('click', shareFromDetail);
  }

  // 상세보기 복사 버튼
  const btnDetailCopy = document.getElementById('btn-detail-copy');
  if (btnDetailCopy) {
    btnDetailCopy.addEventListener('click', copyFromDetail);
  }

  // 상세보기 삭제 버튼
  const btnDetailDelete = document.getElementById('btn-detail-delete');
  if (btnDetailDelete) {
    btnDetailDelete.addEventListener('click', deleteFromDetail);
  }
}

/* ========================================
   텍스트 크기 조절 함수
   ======================================== */

// 텍스트 크기 팝업 토글
function toggleTextSizePopup() {
  if (textSizePopup) {
    textSizePopup.classList.toggle('active');
    updateTextSizePopupUI();
  }
}

// 텍스트 크기 팝업 닫기
function closeTextSizePopup() {
  if (textSizePopup) {
    textSizePopup.classList.remove('active');
  }
}

// 텍스트 크기 팝업 UI 업데이트
function updateTextSizePopupUI() {
  if (textSizePopup) {
    textSizePopup.querySelectorAll('.popup-item').forEach((item) => {
      item.classList.remove('active');
      if (item.dataset.size === currentTextSize) {
        item.classList.add('active');
      }
    });
  }
}

// 텍스트 크기 설정
function setTextSize(size) {
  currentTextSize = size;

  // 클래스 초기화 후 새 크기 적용
  memoTextarea.classList.remove('text-small', 'text-medium', 'text-large');
  memoTextarea.classList.add(`text-${size}`);

  // LocalStorage에 저장
  localStorage.setItem(TEXT_SIZE_KEY, size);
}

// 텍스트 크기 불러오기
function loadTextSize() {
  const savedSize = localStorage.getItem(TEXT_SIZE_KEY);
  if (savedSize) {
    currentTextSize = savedSize;
    setTextSize(savedSize);
  }
}

/* ========================================
   체크리스트 함수
   ======================================== */

// 체크리스트 삽입/삭제 토글 (툴바 버튼용)
function insertChecklist() {
  const textarea = memoTextarea;
  const start = textarea.selectionStart;
  const text = textarea.value;

  // 현재 커서가 있는 줄 찾기
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = text.indexOf('\n', start);
  const actualLineEnd = lineEnd === -1 ? text.length : lineEnd;
  const currentLine = text.substring(lineStart, actualLineEnd);

  // 현재 줄에 체크박스가 있는지 확인
  if (currentLine.includes('☐') || currentLine.includes('☑')) {
    // 체크박스가 있으면 삭제
    const newLine = currentLine.replace(/[☐☑]\s?/, '');
    const newText = text.substring(0, lineStart) + newLine + text.substring(actualLineEnd);
    textarea.value = newText;
    // 커서 위치 조정 (삭제된 문자 수만큼)
    const removedLength = currentLine.length - newLine.length;
    const newCursorPos = Math.max(lineStart, start - removedLength);
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  } else {
    // 체크박스가 없으면 줄 맨 앞에 삽입
    const checkbox = '☐ ';
    const newText = text.substring(0, lineStart) + checkbox + text.substring(lineStart);
    textarea.value = newText;
    const newCursorPos = start + checkbox.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  }

  textarea.focus();
}

// 체크박스 클릭 시 체크 토글 (textarea 클릭용)
function handleCheckboxClick(event) {
  const textarea = memoTextarea;
  const cursorPos = textarea.selectionStart;
  const text = textarea.value;

  // 클릭한 위치의 문자 확인
  const clickedChar = text[cursorPos];
  const prevChar = cursorPos > 0 ? text[cursorPos - 1] : '';

  let targetPos = -1;

  // 클릭한 문자가 체크박스인지 확인
  if (clickedChar === '☐' || clickedChar === '☑') {
    targetPos = cursorPos;
  } else if (prevChar === '☐' || prevChar === '☑') {
    targetPos = cursorPos - 1;
  }

  if (targetPos >= 0) {
    const targetChar = text[targetPos];
    const newChar = targetChar === '☐' ? '☑' : '☐';
    const newText = text.substring(0, targetPos) + newChar + text.substring(targetPos + 1);
    textarea.value = newText;
    textarea.setSelectionRange(cursorPos, cursorPos);
  }
}

/* ========================================
   이미지 첨부 함수
   ======================================== */

// 이미지 파일 선택 처리
function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // 이미지 파일 확인
  if (!file.type.startsWith('image/')) {
    alert('이미지 파일만 첨부할 수 있습니다.');
    return;
  }

  // 파일 크기 제한 (5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('이미지 크기는 5MB 이하만 가능합니다.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    // Base64로 변환된 이미지 추가
    currentImages.push(e.target.result);
    renderImagePreviews();
  };
  reader.readAsDataURL(file);

  // 입력 초기화
  event.target.value = '';
}

// 이미지 미리보기 렌더링
function renderImagePreviews() {
  if (!imagePreviewContainer) return;

  imagePreviewContainer.innerHTML = '';

  currentImages.forEach((imageData, index) => {
    const item = document.createElement('div');
    item.className = 'image-preview-item';

    const img = document.createElement('img');
    img.src = imageData;
    img.alt = '첨부 이미지';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.addEventListener('click', () => {
      deleteImage(index);
    });

    item.appendChild(img);
    item.appendChild(deleteBtn);
    imagePreviewContainer.appendChild(item);
  });
}

// 이미지 삭제
function deleteImage(index) {
  currentImages.splice(index, 1);
  renderImagePreviews();
}

/* ========================================
   그리기 함수
   ======================================== */

// 그리기 화면 표시
function showDrawScreen() {
  if (!drawScreen || !drawCanvas) return;

  memoScreen.classList.remove('active');
  drawScreen.classList.add('active');

  // 캔버스 초기화
  initCanvas();
}

// 그리기 화면 숨기기
function hideDrawScreen() {
  if (!drawScreen) return;

  drawScreen.classList.remove('active');
  memoScreen.classList.add('active');
}

// 캔버스 초기화
function initCanvas() {
  if (!drawCanvas) return;

  const container = drawCanvas.parentElement;
  drawCanvas.width = container.clientWidth;
  drawCanvas.height = container.clientHeight;

  drawCtx = drawCanvas.getContext('2d');
  drawCtx.fillStyle = '#FFFFFF';
  drawCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
  drawCtx.lineCap = 'round';
  drawCtx.lineJoin = 'round';
  drawCtx.lineWidth = 3;
  drawCtx.strokeStyle = currentColor;

  // 이벤트 리스너 설정
  drawCanvas.addEventListener('mousedown', startDrawing);
  drawCanvas.addEventListener('mousemove', draw);
  drawCanvas.addEventListener('mouseup', stopDrawing);
  drawCanvas.addEventListener('mouseout', stopDrawing);

  // 터치 이벤트
  drawCanvas.addEventListener('touchstart', handleTouchStart);
  drawCanvas.addEventListener('touchmove', handleTouchMove);
  drawCanvas.addEventListener('touchend', stopDrawing);

  // 지우개 초기화
  isEraser = false;
  if (btnEraser) {
    btnEraser.classList.remove('active');
  }
}

// 그리기 시작
function startDrawing(e) {
  isDrawing = true;
  drawCtx.beginPath();
  drawCtx.moveTo(e.offsetX, e.offsetY);
}

// 그리기
function draw(e) {
  if (!isDrawing) return;

  if (isEraser) {
    drawCtx.strokeStyle = '#FFFFFF';
    drawCtx.lineWidth = 20;
  } else {
    drawCtx.strokeStyle = currentColor;
    drawCtx.lineWidth = 3;
  }

  drawCtx.lineTo(e.offsetX, e.offsetY);
  drawCtx.stroke();
}

// 그리기 중지
function stopDrawing() {
  isDrawing = false;
}

// 터치 시작
function handleTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = drawCanvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;

  isDrawing = true;
  drawCtx.beginPath();
  drawCtx.moveTo(x, y);
}

// 터치 이동
function handleTouchMove(e) {
  e.preventDefault();
  if (!isDrawing) return;

  const touch = e.touches[0];
  const rect = drawCanvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;

  if (isEraser) {
    drawCtx.strokeStyle = '#FFFFFF';
    drawCtx.lineWidth = 20;
  } else {
    drawCtx.strokeStyle = currentColor;
    drawCtx.lineWidth = 3;
  }

  drawCtx.lineTo(x, y);
  drawCtx.stroke();
}

// 색상 선택
function selectColor(btn) {
  // 지우개 모드 해제
  isEraser = false;
  if (btnEraser) {
    btnEraser.classList.remove('active');
  }

  // 기존 선택 해제
  document.querySelectorAll('.color-btn').forEach((b) => {
    b.classList.remove('active');
  });

  // 새 색상 선택
  btn.classList.add('active');
  currentColor = btn.dataset.color;
}

// 지우개 토글
function toggleEraser() {
  isEraser = !isEraser;
  if (btnEraser) {
    btnEraser.classList.toggle('active', isEraser);
  }
}

// 캔버스 전체 지우기
function clearCanvas() {
  if (!drawCtx || !drawCanvas) return;

  drawCtx.fillStyle = '#FFFFFF';
  drawCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
}

// 그림 저장
function saveDrawing() {
  if (!drawCanvas) return;

  // 캔버스를 이미지로 변환
  const imageData = drawCanvas.toDataURL('image/png');
  currentImages.push(imageData);

  // 메모 화면으로 돌아가기
  hideDrawScreen();
  renderImagePreviews();
}

/* ========================================
   백업 관리 함수
   ======================================== */

// 메모 내보내기 (Export) - 브라우저 인쇄 기능 (PDF로 저장 가능)
function exportMemos() {
  // 메모가 없으면 알림
  if (Object.keys(memos).length === 0) {
    alert('내보낼 메모가 없습니다.');
    return;
  }

  try {
    // 날짜순으로 정렬
    const sortedDates = Object.keys(memos).sort();

    // 인쇄용 HTML 생성
    let printContent = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>하루메모</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Apple SD Gothic Neo', '맑은 고딕', sans-serif;
            padding: 40px;
            color: #333;
          }
          h1 {
            text-align: center;
            margin-bottom: 30px;
            font-size: 24px;
            color: #FF6B9D;
          }
          .memo {
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
            page-break-inside: avoid;
          }
          .memo:last-child { border-bottom: none; }
          .date {
            font-weight: bold;
            font-size: 14px;
            color: #FF6B9D;
            margin-bottom: 10px;
          }
          .content {
            font-size: 14px;
            line-height: 1.8;
            white-space: pre-wrap;
            word-break: break-word;
          }
          .images { margin-top: 15px; }
          .images img {
            max-width: 100%;
            max-height: 300px;
            margin: 5px 0;
            border-radius: 8px;
          }
          @media print {
            body { padding: 20px; }
            .memo { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>하루메모</h1>
    `;

    sortedDates.forEach((date) => {
      const memo = memos[date];
      const [year, month, day] = date.split('-');
      const dateTitle = `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;

      printContent += `
        <div class="memo">
          <div class="date">${dateTitle}</div>
          <div class="content">${escapeHtml(memo.content) || '(내용 없음)'}</div>
      `;

      // 이미지 추가
      if (memo.images && memo.images.length > 0) {
        printContent += '<div class="images">';
        memo.images.forEach((imgData) => {
          printContent += `<img src="${imgData}" alt="첨부 이미지">`;
        });
        printContent += '</div>';
      }

      printContent += '</div>';
    });

    printContent += '</body></html>';

    // 새 창에서 인쇄
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();

    // 이미지 로딩 후 인쇄
    printWindow.onload = function() {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };

  } catch (error) {
    console.error('내보내기 실패:', error);
    alert('메모 내보내기에 실패했습니다.');
  }
}

// HTML 특수문자 이스케이프
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 메모 가져오기 (Import) - 파일 선택 창 열기
function openImportDialog() {
  const fileInput = document.getElementById('import-file-input');
  if (fileInput) {
    fileInput.click();
  }
}

// 메모 가져오기 (Import) - 파일 처리 (TXT 형식)
function importMemos(event) {
  const file = event.target.files[0];

  // 파일 선택 안 했으면 종료
  if (!file) {
    return;
  }

  // TXT 파일 형식 검증
  if (!file.name.endsWith('.txt')) {
    alert('TXT 파일만 가져올 수 있습니다.');
    event.target.value = ''; // 입력 초기화
    return;
  }

  // 복원 전 확인 메시지
  const confirmMsg = '메모를 가져오시겠습니까?\n(같은 날짜의 메모는 덮어씌워집니다)';
  if (!confirm(confirmMsg)) {
    event.target.value = ''; // 입력 초기화
    return;
  }

  // 파일 읽기
  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const txtContent = e.target.result;

      // TXT 파싱: "=== YYYY년 M월 D일 ===" 패턴으로 분리
      const memoBlocks = txtContent.split(/===\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*===/);

      // 가져온 메모 수 카운트
      let importCount = 0;

      // memoBlocks[0]은 첫 구분자 앞의 빈 문자열
      // 이후로 [year, month, day, content, year, month, day, content, ...] 형태
      for (let i = 1; i < memoBlocks.length; i += 4) {
        const year = memoBlocks[i];
        const month = memoBlocks[i + 1];
        const day = memoBlocks[i + 2];
        let content = memoBlocks[i + 3] || '';

        // 내용 정리 (앞뒤 공백 제거, [첨부 이미지] 라인 제거)
        content = content.trim();
        content = content.replace(/\[첨부 이미지 \d+개\]\s*/g, '').trim();

        // 날짜 문자열 생성
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // 메모 저장
        if (content && content !== '(내용 없음)') {
          memos[dateStr] = {
            id: dateStr,
            content: content,
            images: [],
            emoji: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          importCount++;
        }
      }

      if (importCount === 0) {
        throw new Error('가져올 메모가 없습니다.');
      }

      // LocalStorage에 저장
      saveMemos();

      // 달력 새로고침
      renderCalendar();

      alert(`${importCount}개의 메모를 가져왔습니다.`);
    } catch (error) {
      console.error('가져오기 실패:', error);
      alert('메모 가져오기에 실패했습니다.\n올바른 형식의 파일인지 확인해주세요.');
    }

    // 입력 초기화 (같은 파일 다시 선택 가능하게)
    event.target.value = '';
  };

  reader.onerror = function() {
    alert('파일을 읽는 중 오류가 발생했습니다.');
    event.target.value = '';
  };

  reader.readAsText(file);
}

/* ========================================
   더보기 메뉴 함수
   ======================================== */

// 더보기 메뉴 토글
function toggleMoreMenu() {
  if (moreMenu) {
    moreMenu.classList.toggle('active');
  }
}

// 더보기 메뉴 닫기
function closeMoreMenu() {
  if (moreMenu) {
    moreMenu.classList.remove('active');
  }
}

/* ========================================
   다크모드 함수
   ======================================== */

// 다크모드 토글
function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  applyDarkMode();
  saveDarkMode();
  closeMoreMenu();
}

// 다크모드 적용
function applyDarkMode() {
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

// 다크모드 저장
function saveDarkMode() {
  localStorage.setItem(DARKMODE_KEY, isDarkMode ? 'true' : 'false');
}

// 다크모드 불러오기
function loadDarkMode() {
  const saved = localStorage.getItem(DARKMODE_KEY);
  isDarkMode = saved === 'true';
  applyDarkMode();
}

/* ========================================
   상세보기 함수
   ======================================== */

// 상세보기 화면 표시
function showDetailScreen(date) {
  const memo = getMemo(date);
  if (!memo) return;

  // 날짜 포맷팅
  const [year, month, day] = date.split('-');
  const detailDate = document.getElementById('detail-date');
  if (detailDate) {
    detailDate.textContent = `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
  }

  // 메모 내용 표시
  const detailText = document.getElementById('detail-text');
  if (detailText) {
    detailText.textContent = memo.content || '(내용 없음)';
  }

  // 이미지 표시
  const detailImages = document.getElementById('detail-images');
  if (detailImages) {
    detailImages.innerHTML = '';
    if (memo.images && memo.images.length > 0) {
      memo.images.forEach((imgData) => {
        const img = document.createElement('img');
        img.src = imgData;
        img.alt = '첨부 이미지';
        detailImages.appendChild(img);
      });
    }
  }

  // 화면 전환
  mainScreen.classList.remove('active');
  detailScreen.classList.add('active');
}

// 상세보기 화면 닫기
function hideDetailScreen() {
  detailScreen.classList.remove('active');
  mainScreen.classList.add('active');
}

// 상세보기에서 수정 화면으로 이동
function editFromDetail() {
  detailScreen.classList.remove('active');
  openMemoForDate(selectedDate);
}

// 상세보기에서 삭제
function deleteFromDetail() {
  if (confirm('이 메모를 삭제하시겠습니까?')) {
    deleteMemo(selectedDate);
    hideDetailScreen();
    renderCalendar();
  }
}

// 상세보기에서 공유
function shareFromDetail() {
  const memo = getMemo(selectedDate);
  if (!memo) return;

  if (navigator.share) {
    navigator.share({
      title: '하루메모',
      text: memo.content
    }).catch(() => {
      // 공유 취소됨
    });
  } else {
    alert('이 브라우저에서는 공유 기능을 지원하지 않습니다.');
  }
}

// 상세보기에서 복사
function copyFromDetail() {
  const memo = getMemo(selectedDate);
  if (!memo) return;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(memo.content).then(() => {
      alert('메모가 클립보드에 복사되었습니다.');
    }).catch(() => {
      alert('복사에 실패했습니다.');
    });
  } else {
    alert('이 브라우저에서는 복사 기능을 지원하지 않습니다.');
  }
}

/* ========================================
   키보드 대응 (모바일)
   ======================================== */

// 툴바 버튼 클릭 시 포커스 손실 방지 (키보드가 내려가지 않게)
function preventToolbarFocusLoss() {
  const toolbar = document.querySelector('.memo-toolbar');
  if (!toolbar) return;

  // 툴바 내의 모든 버튼에 대해 mousedown 시 preventDefault (포커스 이동 방지)
  toolbar.querySelectorAll('.toolbar-btn').forEach((btn) => {
    // 닫기 버튼(btn-close)은 제외 - 메인으로 돌아가므로
    if (btn.id === 'btn-close') return;

    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });

    // 모바일: 클릭 후 textarea로 포커스 복원
    btn.addEventListener('click', () => {
      // 그리기 버튼은 다른 화면으로 이동하므로 제외
      if (btn.id !== 'btn-draw') {
        setTimeout(() => {
          if (memoScreen.classList.contains('active') && memoTextarea) {
            memoTextarea.focus();
          }
        }, 10);
      }
    });
  });

  // 팝업 메뉴 아이템도 동일하게 처리
  const textSizePopup = document.getElementById('text-size-popup');
  if (textSizePopup) {
    textSizePopup.querySelectorAll('.popup-item').forEach((item) => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });
      item.addEventListener('click', () => {
        setTimeout(() => {
          if (memoTextarea) {
            memoTextarea.focus();
          }
        }, 10);
      });
    });
  }

  // 툴바 버튼 래퍼도 처리
  const toolbarWrapper = toolbar.querySelector('.toolbar-btn-wrapper');
  if (toolbarWrapper) {
    toolbarWrapper.addEventListener('mousedown', (e) => {
      if (e.target.closest('.toolbar-btn') || e.target.closest('.popup-item')) {
        e.preventDefault();
      }
    });
  }
}

// 키보드가 올라올 때 화면 높이 조정
function initKeyboardHandler() {
  // visualViewport API 지원 확인
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', adjustForKeyboard);
    window.visualViewport.addEventListener('scroll', adjustForKeyboard);
  }

  // textarea 포커스 시 스크롤 조정
  if (memoTextarea) {
    memoTextarea.addEventListener('focus', () => {
      // 약간의 딜레이 후 툴바가 보이도록 스크롤
      setTimeout(() => {
        const toolbar = document.querySelector('.memo-toolbar');
        if (toolbar) {
          toolbar.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }, 300);
    });
  }
}

// 키보드에 맞게 화면 조정
function adjustForKeyboard() {
  if (!memoScreen.classList.contains('active')) return;

  const viewport = window.visualViewport;
  if (!viewport) return;

  // 전체 화면 높이와 비교하여 키보드가 올라왔는지 확인
  const windowHeight = window.innerHeight;
  const viewportHeight = viewport.height;
  const keyboardHeight = windowHeight - viewportHeight;

  if (keyboardHeight > 100) {
    // 키보드가 올라온 상태
    memoScreen.style.height = `${viewportHeight}px`;
    memoScreen.style.transform = `translateY(${viewport.offsetTop}px)`;
  } else {
    // 키보드가 내려간 상태
    memoScreen.style.height = '';
    memoScreen.style.transform = '';
  }
}

/* ========================================
   앱 초기화
   ======================================== */
function initApp() {
  console.log('하루메모 앱 시작');

  // LocalStorage에서 메모 불러오기
  loadMemos();

  // 텍스트 크기 불러오기
  loadTextSize();

  // 다크모드 불러오기
  loadDarkMode();

  // 달력 렌더링
  renderCalendar();

  // 이벤트 리스너 등록
  initEventListeners();

  // 키보드 핸들러 초기화 (모바일 대응)
  initKeyboardHandler();

  // 파일 가져오기 이벤트 리스너
  const fileInput = document.getElementById('import-file-input');
  if (fileInput) {
    fileInput.addEventListener('change', importMemos);
  }
}

// DOM 로드 완료 후 앱 초기화
document.addEventListener('DOMContentLoaded', initApp);
