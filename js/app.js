/* ========================================
   하루메모 - 메인 앱 스크립트
   ======================================== */

'use strict';

/* ========================================
   상수
   ======================================== */
const STORAGE_KEY = 'harumemo_data';
const TEXT_SIZE_KEY = 'harumemo_textsize';

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
const textSizePopup = document.getElementById('text-size-popup');

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
  if (!content.trim()) {
    // 내용이 비어있으면 메모 삭제
    deleteMemo(date);
    return;
  }

  const now = new Date().toISOString();

  if (memos[date]) {
    // Update: 기존 메모 수정
    memos[date].content = content;
    memos[date].updatedAt = now;
  } else {
    // Create: 새 메모 생성
    memos[date] = {
      id: date, // 날짜를 ID로 사용
      content: content,
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
   달력 렌더링 함수
   ======================================== */
// 달력 생성
function renderCalendar() {
  // 월 제목 업데이트
  monthTitle.textContent = `${currentMonth + 1}월`;

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
      openMemoForDate(selectedDate);
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
  } else {
    // 새 메모
    memoTextarea.value = '';
  }

  showMemoScreen();
}

/* ========================================
   이벤트 리스너 등록
   ======================================== */
function initEventListeners() {
  // 새 메모 버튼 (FAB)
  btnNewMemo.addEventListener('click', () => {
    // 오늘 날짜로 새 메모 작성
    const today = new Date();
    selectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    openMemoForDate(selectedDate);
  });

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

  // 팝업 외부 클릭 시 닫기
  document.addEventListener('click', (e) => {
    if (textSizePopup && btnText && !textSizePopup.contains(e.target) && e.target !== btnText) {
      closeTextSizePopup();
    }
  });
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

// 체크리스트 삽입 또는 토글
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
  if (currentLine.includes('☐')) {
    // 빈 체크박스 → 체크된 체크박스로 변경
    const newLine = currentLine.replace('☐', '☑');
    const newText = text.substring(0, lineStart) + newLine + text.substring(actualLineEnd);
    textarea.value = newText;
    textarea.setSelectionRange(start, start);
  } else if (currentLine.includes('☑')) {
    // 체크된 체크박스 → 빈 체크박스로 변경
    const newLine = currentLine.replace('☑', '☐');
    const newText = text.substring(0, lineStart) + newLine + text.substring(actualLineEnd);
    textarea.value = newText;
    textarea.setSelectionRange(start, start);
  } else {
    // 체크박스가 없으면 새로 삽입
    const checkbox = '☐ ';
    const newText = text.substring(0, start) + checkbox + text.substring(start);
    textarea.value = newText;
    const newCursorPos = start + checkbox.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  }

  textarea.focus();
}

/* ========================================
   백업 관리 함수
   ======================================== */

// 메모 내보내기 (Export)
function exportMemos() {
  // 메모가 없으면 알림
  if (Object.keys(memos).length === 0) {
    alert('내보낼 메모가 없습니다.');
    return;
  }

  try {
    // JSON 문자열로 변환
    const jsonData = JSON.stringify(memos, null, 2);

    // Blob 생성
    const blob = new Blob([jsonData], { type: 'application/json' });

    // 다운로드 링크 생성
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    // 파일명에 날짜 포함
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    link.download = `하루메모_백업_${dateStr}.json`;
    link.href = url;

    // 다운로드 실행
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // URL 해제
    URL.revokeObjectURL(url);

    alert(`${Object.keys(memos).length}개의 메모를 내보냈습니다.`);
  } catch (error) {
    console.error('내보내기 실패:', error);
    alert('메모 내보내기에 실패했습니다.');
  }
}

// 메모 가져오기 (Import) - 파일 선택 창 열기
function openImportDialog() {
  const fileInput = document.getElementById('import-file-input');
  if (fileInput) {
    fileInput.click();
  }
}

// 메모 가져오기 (Import) - 파일 처리
function importMemos(event) {
  const file = event.target.files[0];

  // 파일 선택 안 했으면 종료
  if (!file) {
    return;
  }

  // JSON 파일 형식 검증
  if (!file.name.endsWith('.json')) {
    alert('JSON 파일만 가져올 수 있습니다.');
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
      // JSON 파싱
      const importedData = JSON.parse(e.target.result);

      // 데이터 형식 검증
      if (typeof importedData !== 'object' || importedData === null) {
        throw new Error('잘못된 데이터 형식');
      }

      // 가져온 메모 수 카운트
      let importCount = 0;

      // 기존 메모에 병합
      for (const date in importedData) {
        const memo = importedData[date];

        // 메모 데이터 유효성 검사
        if (memo && typeof memo.content === 'string') {
          memos[date] = {
            id: date,
            content: memo.content,
            emoji: memo.emoji || '',
            createdAt: memo.createdAt || new Date().toISOString(),
            updatedAt: memo.updatedAt || new Date().toISOString()
          };
          importCount++;
        }
      }

      // LocalStorage에 저장
      saveMemos();

      // 달력 새로고침
      renderCalendar();

      alert(`${importCount}개의 메모를 가져왔습니다.`);
    } catch (error) {
      console.error('가져오기 실패:', error);
      alert('메모 가져오기에 실패했습니다.\n올바른 백업 파일인지 확인해주세요.');
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
   앱 초기화
   ======================================== */
function initApp() {
  console.log('하루메모 앱 시작');

  // LocalStorage에서 메모 불러오기
  loadMemos();

  // 텍스트 크기 불러오기
  loadTextSize();

  // 달력 렌더링
  renderCalendar();

  // 이벤트 리스너 등록
  initEventListeners();

  // 파일 가져오기 이벤트 리스너
  const fileInput = document.getElementById('import-file-input');
  if (fileInput) {
    fileInput.addEventListener('change', importMemos);
  }
}

// DOM 로드 완료 후 앱 초기화
document.addEventListener('DOMContentLoaded', initApp);
