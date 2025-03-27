// script.js (스크롤 기능 추가된 전체 코드)

window.onerror = function (message, source, lineno, colno, error) {
    console.error("🚨 전역 오류 발생:", message, "\n파일:", source, `\n라인:${lineno}:${colno}`, "\n오류 객체:", error);
    alert(`앗! 예상치 못한 오류가 발생했어요 😢 콘솔(F12)을 확인해주세요.\n오류: ${message}`);
};

document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG: 상태 변수 정의 시작");
    const PRIMARY_DATA_KEY = 'mtbcTrackerData_v1_1';
    const APP_VERSION = "1.1";
    let chartInstance = null;
    let measurements = [];
    let targets = {};
    let notes = [];
    let currentNoteSortOrder = 'newest';
    let selectedMetrics = ['weight'];

    // ----- 스크롤 관련 변수 선언 시작 -----
    let lastScrollY = window.scrollY;
    let isTabBarCollapsed = false; // 현재 탭 바 축소 상태
    // ----- 스크롤 관련 변수 선언 끝 -----

    console.log("DEBUG: 상태 변수 정의 완료");


    console.log("DEBUG: DOM 요소 가져오기 시작");
    const mainTitle = document.querySelector('#main-title');
    const tabBar = document.querySelector('.tab-bar');
    const tabContents = document.querySelectorAll('.tab-content');
    const form = document.getElementById('measurement-form');
    const formTitle = document.getElementById('form-title');
    const saveUpdateBtn = document.getElementById('save-update-button');
    const cancelEditBtn = document.getElementById('cancel-edit-button');
    const editIndexInput = document.getElementById('edit-index');
    const currentWeekSpan = document.getElementById('current-week');
    const historyContainer = document.getElementById('history-table-container');
    const prevWeekComparisonContainer = document.getElementById('prev-week-comparison-container');
    const initialComparisonContainer = document.getElementById('initial-comparison-container');
    const targetComparisonContainer = document.getElementById('target-comparison-container');
    const calendarViewMeasurementList = document.getElementById('measurement-date-list');
    const countdownDisplay = document.getElementById('countdown-display');
    const chartCanvas = document.getElementById('measurement-chart');
    const chartSelector = document.getElementById('chart-selector');
    const selectAllChartsBtn = document.getElementById('select-all-charts');
    const deselectAllChartsBtn = document.getElementById('deselect-all-charts');
    const resetDataButton = document.getElementById('reset-data-button');
    const exportDataButton = document.getElementById('export-data-button');
    const importDataButton = document.getElementById('import-data-button');
    const importFileInput = document.getElementById('import-file-input');
    const targetForm = document.getElementById('target-form');
    let targetGrid; if (targetForm) { targetGrid = targetForm.querySelector('.target-grid'); }
    const saveTargetsButton = document.getElementById('save-targets-button');
    const noteFormArea = document.getElementById('note-form-area');
    const noteTitleInput = document.getElementById('note-title');
    const noteContentInput = document.getElementById('note-content');
    const saveNoteButton = document.getElementById('save-note-button');
    const noteSortOrderSelect = document.getElementById('note-sort-order');
    const notesListContainer = document.getElementById('notes-list-container');
    const noteFormTitle = document.getElementById('note-form-title');
    const editNoteIdInput = document.getElementById('edit-note-id');
    const cancelEditNoteBtn = document.getElementById('cancel-edit-note-button');
    const savePopup = document.getElementById('save-popup');
    console.log("DEBUG: DOM 요소 가져오기 완료");

    console.log("DEBUG: 상수 정의 시작");
    const baseNumericKeys = ['weight', 'shoulder', 'neck', 'chest', 'waist', 'hips', 'thigh', 'calf', 'arm'];
    const hormoneKeys = ['estradiol', 'progesterone'];
    const libidoKey = ['libido'];
    const statusScoreKeys = ['semen_score', 'health_score'];
    const statusNotesKeys = ['semen_notes', 'health_notes'];
    const numericKeys = [...baseNumericKeys, ...hormoneKeys, ...libidoKey, ...statusScoreKeys];
    const textKeys = [...statusNotesKeys];
    const displayKeysInOrder = ['weight', 'shoulder', 'neck', 'chest', 'waist', 'hips', 'thigh', 'calf', 'arm', 'estradiol', 'progesterone', 'libido', 'semen_score', 'semen_notes', 'health_score', 'health_notes'];
    const measurementLabels = {
        week: '주차', date: '날짜', weight: '체중 (kg)', shoulder: '어깨너비 (cm)', neck: '목둘레 (cm)',
        chest: '가슴둘레 (cm)', waist: '허리둘레 (cm)', hips: '엉덩이둘레 (cm)', thigh: '허벅지둘레 (cm)', calf: '종아리둘레 (cm)',
        arm: '팔뚝둘레 (cm)', estradiol: '에스트라디올 (mg)', progesterone: '프로게스테론 (mg)', libido: '성욕 (회/주)',
        semen_score: '정액 상태 점수', semen_notes: '정액 상태 메모', health_score: '건강 상태 점수', health_notes: '건강 상태 메모'
    };
    console.log("DEBUG: 상수 정의 완료");

    console.log("DEBUG: 함수 정의 시작");

    function formatValue(value) {
        if (typeof value === 'number') {
            return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 1 });
        }
        return value || '-';
    }

    function formatTimestamp(dateInput) {
        if (!dateInput) return 'N/A';
        let date;
        if (typeof dateInput === 'number') {
            date = new Date(dateInput);
        } else {
            // Handle cases like "YYYY.MM.DD"
             const parts = typeof dateInput === 'string' ? dateInput.match(/(\d{4})\.*? *(\d{1,2})\.*? *(\d{1,2})\.?/) : null;
             if (parts) {
                 date = new Date(parseInt(parts[1]), parseInt(parts[2]) - 1, parseInt(parts[3]));
             } else {
                 date = new Date(dateInput); // Fallback for standard parsing
             }
        }

        if (isNaN(date.getTime())) return "유효하지 않음";

        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        // Check if time is midnight (00:00) - often means time wasn't recorded
        if (hours === '00' && minutes === '00' && dateInput.toString().indexOf(':') === -1) {
             return `${year}-${month}-${day}`; // Only return date if time seems default/absent
        }
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }


    function showPopup(message, duration = 2000) {
        if (!savePopup) {
            console.error("DEBUG: [오류!] Popup 요소를 찾을 수 없습니다.");
            alert(message);
            return;
        }
        console.log(`DEBUG: 팝업 표시: "${message}"`);
        savePopup.textContent = message;
        savePopup.classList.add('show');
        if (savePopup.timerId) {
            clearTimeout(savePopup.timerId);
        }

        savePopup.timerId = setTimeout(() => {
            savePopup.classList.remove('show');
            console.log(`DEBUG: 팝업 숨김: "${message}"`);
            savePopup.timerId = null;
        }, duration);
    }


    function setupTargetInputs() {
        if (!targetGrid) return;
        targetGrid.innerHTML = '';
        for (const key of displayKeysInOrder) {
            if (numericKeys.includes(key)) {
                const div = document.createElement('div');
                div.classList.add('form-group');
                div.innerHTML = `<label for="target_${key}">${measurementLabels[key]}</label><input type="number" id="target_${key}" name="${key}" step="0.1" min="0">`;
                targetGrid.appendChild(div);
            }
        }
        console.log("DEBUG: 목표 입력 필드 설정 완료");
    }

    function populateTargetInputs() {
        console.log("DEBUG: populateTargetInputs 호출됨");
        if (!targetGrid) return;
        for (const key of numericKeys) {
            const input = document.getElementById(`target_${key}`);
            if (input) {
                input.value = targets[key] !== undefined && targets[key] !== null ? targets[key] : '';
            }
        }
        console.log("DEBUG: 목표 입력 필드에 데이터 채우기 완료");
    }

    function savePrimaryDataToStorage() {
        try {
            const dataToSave = {
                measurements: measurements,
                targets: targets,
                notes: notes
            };
            localStorage.setItem(PRIMARY_DATA_KEY, JSON.stringify(dataToSave));
            console.log("DEBUG: 데이터가 로컬 스토리지에 저장되었습니다.");
        } catch (e) {
            console.error(" 로컬 스토리지 저장 오류:", e);
            alert("데이터를 로컬 스토리지에 저장하는 데 실패했습니다.");
        }
    }

    function loadAllData() {
        try {
            const storedData = localStorage.getItem(PRIMARY_DATA_KEY);
            if (storedData) {
                const data = JSON.parse(storedData);
                measurements = Array.isArray(data.measurements) ? data.measurements : [];
                targets = typeof data.targets === 'object' && data.targets !== null ? data.targets : {};
                notes = Array.isArray(data.notes) ? data.notes : [];
                measurements.forEach((m, index) => m.week = index); // Ensure week index is correct
                console.log("DEBUG: 스토리지에서 데이터 로드됨:", measurements.length, "측정값,", Object.keys(targets).length, "목표,", notes.length, "메모.");
            } else {
                console.log("DEBUG: 스토리지에 데이터 없음. 초기화합니다.");
                measurements = []; targets = {}; notes = [];
            }
        } catch (e) {
            console.error(" 스토리지에서 데이터 로드 오류:", e);
            alert("스토리지에서 데이터를 로드하는 중 오류가 발생했습니다. 기존 데이터가 손상되었을 수 있습니다. 콘솔을 확인해주세요.");
            measurements = []; targets = {}; notes = []; // Reset on error
        }
    }

    function exportMeasurementData() {
        console.log("DEBUG: 전체 데이터 내보내기 시작");
        try {
            const dataToExport = {
                project: "mtbc_tracker", version: APP_VERSION, exportedDate: new Date().toISOString(),
                measurements: measurements, targets: targets, notes: notes
            };
            const dataStr = JSON.stringify(dataToExport, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(dataBlob);
            const a = document.createElement('a');
            const date = new Date();
            const dateStr = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}`;
            a.href = url;
            a.download = `mtbc_tracker_backup_${dateStr}.json`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showPopup("데이터 내보내기 성공! 🎉");
        } catch (e) {
            console.error(" 데이터 내보내기 오류:", e);
            alert("데이터를 내보내는 중 오류가 발생했습니다.");
        }
    }

    function importMeasurementData(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const data = JSON.parse(e.target.result);
                // Basic validation
                if (data && data.project === "mtbc_tracker" && Array.isArray(data.measurements) && typeof data.targets === 'object' && Array.isArray(data.notes)) {
                    if (confirm("현재 데이터를 덮어쓰고 가져온 데이터로 복원하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
                        measurements = data.measurements || [];
                        targets = data.targets || {};
                        notes = data.notes || [];
                        measurements.forEach((m, index) => m.week = index); // Re-index weeks
                        savePrimaryDataToStorage();
                        populateTargetInputs();
                        renderAll();
                        showPopup("데이터 가져오기 성공! ✨");
                        // Optional: reload page if needed for complex state updates, but usually renderAll is enough
                        // location.reload();
                        // alert("데이터를 성공적으로 가져왔습니다. 페이지가 새로고침될 수 있습니다.");
                    }
                } else {
                    alert("파일 형식이 올바르지 않거나 호환되지 않는 데이터입니다.");
                }
            } catch (e) {
                console.error(" 데이터 가져오기 오류:", e);
                alert("파일을 읽거나 데이터를 처리하는 중 오류가 발생했습니다.");
            } finally {
                if (importFileInput) importFileInput.value = ''; // Reset file input
            }
        };
        reader.onerror = function () {
            alert("파일을 읽는 데 실패했습니다.");
            if (importFileInput) importFileInput.value = '';
        };
        reader.readAsText(file);
    }

    function updateCurrentWeekDisplay() {
        if (currentWeekSpan) {
            currentWeekSpan.textContent = measurements.length > 0 ? measurements.length : 0;
        } else { console.error("DEBUG: [오류!] currentWeekSpan 요소 없음!"); }
    }

    function clearTable(container, message = "데이터가 없어요.") {
        if (container) {
            container.innerHTML = `<p style="text-align: center; padding: 20px; color: #a89cc8;">${message}</p>`;
        } else {
            console.error("DEBUG: [오류!] clearTable - container 요소가 유효하지 않습니다.");
        }
    }

    function clearHistoryTable() {
        console.log("DEBUG: -> clearHistoryTable 호출됨");
        clearTable(historyContainer, "측정 기록이 없어요.");
    }

    function clearNotesList() {
        console.log("DEBUG: -> clearNotesList 호출됨");
        clearTable(notesListContainer, "작성된 메모가 없어요.");
    }

    function clearCalendarView() {
        console.log("DEBUG: -> clearCalendarView 호출됨");
        if (calendarViewMeasurementList) {
            calendarViewMeasurementList.innerHTML = '';
        }
        if (countdownDisplay) {
             countdownDisplay.innerHTML = '<p>측정 기록이 없어요.</p>';
        }
    }

    function clearChart() {
        console.log("DEBUG: -> clearChart 호출됨");
        if (chartInstance) {
            console.log("DEBUG: 기존 차트 인스턴스 제거");
            chartInstance.destroy();
            chartInstance = null;
        }
        if (chartCanvas) {
            const ctx = chartCanvas.getContext('2d');
            if(ctx){
                 ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
                 ctx.font = "16px sans-serif";
                 ctx.fillStyle = "#a89cc8";
                 ctx.textAlign = "center";
                 ctx.fillText("표시할 항목을 선택하거나 데이터를 입력하세요.", chartCanvas.width / 2, chartCanvas.height / 2);
             }
        }
    }


   function renderHistoryTable() {
    console.log("DEBUG: -> renderHistoryTable 호출됨");
    if (!historyContainer) { console.error("DEBUG: [오류!] historyContainer 요소 없음!"); return; }
    console.log("DEBUG: renderHistoryTable - Rendering with measurements count:", measurements.length);
    if (!Array.isArray(measurements) || measurements.length === 0) {
        clearHistoryTable();
        return;
    }

    try {
        let tableHTML = '<table><thead><tr>';
        tableHTML += `<th>${measurementLabels['week']}</th>`;
        tableHTML += `<th>${measurementLabels['date']}</th>`;
        for (const key of displayKeysInOrder) {
            tableHTML += `<th>${measurementLabels[key] || key}</th>`;
        }
        tableHTML += '<th class="sticky-col">관리</th></tr></thead><tbody>';
        for (let i = 0; i < measurements.length; i++) {
            const m = measurements[i];
            const displayDate = formatTimestamp(m.date || m.timestamp); // Use formatTimestamp for consistency
            tableHTML += '<tr>';
            tableHTML += `<td>${m.week !== undefined ? m.week : i}</td>`;
            tableHTML += `<td>${displayDate}</td>`;
            for (const key of displayKeysInOrder) {
                tableHTML += `<td>${formatValue(m[key])}</td>`;
            }
            tableHTML += `<td class="action-buttons sticky-col">
                            <button class="btn btn-edit" data-index="${i}">수정</button>
                            <button class="btn btn-delete" data-index="${i}">삭제</button>
                           </td>`;
            tableHTML += '</tr>';
        }
        tableHTML += '</tbody></table>';
        historyContainer.innerHTML = tableHTML;
        console.log("DEBUG: <- renderHistoryTable 완료");
    } catch (e) {
        console.error(" renderHistoryTable 오류:", e);
        historyContainer.innerHTML = '<p style="color: red;">기록 테이블 렌더링 중 오류 발생</p>';
    }
}

    function renderPrevWeekComparisonTable() {
        if (!prevWeekComparisonContainer) return;
        if (measurements.length < 2) {
            clearTable(prevWeekComparisonContainer, "비교할 이전 주 데이터가 부족해요.");
            return;
        }
        const lastWeek = measurements[measurements.length - 1];
        const secondLastWeek = measurements[measurements.length - 2];

        let tableHTML = '<table><thead><tr><th>측정 항목</th><th>최근 주</th><th>이전 주</th><th>변화량</th></tr></thead><tbody>';
        for (const key of displayKeysInOrder) {
            if (numericKeys.includes(key)) {
                const lastValue = parseFloat(lastWeek[key]);
                const secondLastValue = parseFloat(secondLastWeek[key]);
                let change = '-'; let changeClass = '';
                if (!isNaN(lastValue) && !isNaN(secondLastValue)) {
                    const diff = lastValue - secondLastValue;
                    change = diff.toFixed(1);
                    if (diff > 0.05) { change = `+${change}`; changeClass = 'positive-change'; }
                    else if (diff < -0.05) { changeClass = 'negative-change'; }
                } else if (!isNaN(lastValue) && isNaN(secondLastValue)) {
                    change = `${formatValue(lastValue)}`;
                    changeClass = ''; // Or maybe positive? Depends on context.
                } else if (isNaN(lastValue) && !isNaN(secondLastValue)){
                    change = `-${formatValue(secondLastValue)}`; // Indicate value loss
                    changeClass = ''; // Or maybe negative?
                }

                tableHTML += `<tr><td>${measurementLabels[key]}</td><td>${formatValue(lastValue)}</td><td>${formatValue(secondLastValue)}</td><td class="${changeClass}">${change}</td></tr>`;
            }
        }
        tableHTML += '</tbody></table>';
        prevWeekComparisonContainer.innerHTML = tableHTML;
    }

    function renderInitialComparisonTable() {
        if (!initialComparisonContainer) return;
        if (measurements.length < 1) {
             clearTable(initialComparisonContainer, "측정 데이터가 없어요.");
             return;
        }
        const initial = measurements[0];
        const latest = measurements[measurements.length - 1];
        const isOnlyOneRecord = measurements.length === 1;

        const initialDateStr = formatTimestamp(initial.date || initial.timestamp).split(' ')[0]; // Date only
        const latestDateStr = formatTimestamp(latest.date || latest.timestamp).split(' ')[0]; // Date only

        let tableHTML = `<table><thead><tr><th>측정 항목</th><th>처음 (${initialDateStr || '-'})</th><th>최근 (${latestDateStr || '-'})</th><th>총 변화량</th></tr></thead><tbody>`;
        for (const key of displayKeysInOrder) {
            if (numericKeys.includes(key)) {
                const initialValue = parseFloat(initial[key]);
                const latestValue = parseFloat(latest[key]);
                let change = '-'; let changeClass = '';
                if (isOnlyOneRecord) {
                    change = '-';
                } else if (!isNaN(initialValue) && !isNaN(latestValue)) {
                    const diff = latestValue - initialValue;
                    change = diff.toFixed(1);
                    if (diff > 0.05) { change = `+${change}`; changeClass = 'positive-change'; }
                    else if (diff < -0.05) { changeClass = 'negative-change'; }
                } else if (!isNaN(latestValue) && isNaN(initialValue)) {
                    change = `${formatValue(latestValue)}`;
                    changeClass = ''; // Or positive?
                } else if (isNaN(latestValue) && !isNaN(initialValue)) {
                     change = `-${formatValue(initialValue)}`; // Indicate value loss
                     changeClass = ''; // Or negative?
                }

                tableHTML += `<tr><td>${measurementLabels[key]}</td><td>${formatValue(initialValue)}</td><td>${formatValue(latestValue)}</td><td class="${changeClass}">${change}</td></tr>`;
            }
        }
        tableHTML += '</tbody></table>';
        initialComparisonContainer.innerHTML = tableHTML;
    }

    function renderTargetComparisonTable() {
        if (!targetComparisonContainer) return;
        const targetKeysPresent = numericKeys.some(key => targets[key] !== undefined && targets[key] !== null && targets[key] !== '');
        if (!targetKeysPresent) {
            clearTable(targetComparisonContainer, "설정된 목표가 없어요."); return;
        }
        if (measurements.length === 0) {
            clearTable(targetComparisonContainer, "측정 데이터가 없어요.");
            return;
        }

        const latestMeasurement = measurements[measurements.length - 1];
        let tableHTML = '<table><thead><tr><th>측정 항목</th><th>목표</th><th>현재</th><th>달성률</th><th>차이</th></tr></thead><tbody>';
        for (const key of displayKeysInOrder) {
            // Only show rows where a target exists for that key
            if (numericKeys.includes(key) && targets[key] !== undefined && targets[key] !== null && targets[key] !== '') {
                const targetValue = parseFloat(targets[key]);
                const currentValue = parseFloat(latestMeasurement[key]);
                let difference = '-'; let achievementRate = '-'; let differenceClass = ''; let rateClass = '';

                // Calculate only if target and current values are valid numbers
                if (!isNaN(targetValue) && !isNaN(currentValue)) {
                     // Difference calculation
                     const diff = currentValue - targetValue;
                     difference = diff.toFixed(1);
                     if (diff > 0.05) { difference = `+${difference}`; differenceClass = 'positive-change'; }
                     else if (diff < -0.05) { differenceClass = 'negative-change'; }
                     else { differenceClass = 'target-achieved'; } // Very close or exact

                     // Achievement rate calculation (only if target is positive)
                     if (targetValue > 0) {
                        const rate = (currentValue / targetValue) * 100;
                        achievementRate = `${rate.toFixed(0)}%`;
                        // Rate class based on percentage
                        if (rate >= 100) rateClass = 'target-achieved';
                        else if (rate >= 80) rateClass = 'positive-change';
                        else rateClass = 'negative-change';
                    } else { // Handle targetValue being 0 or negative (rate calculation invalid)
                         achievementRate = '-';
                         rateClass = '';
                         // If target is 0 and current is 0, maybe 'achieved'?
                         if (targetValue === 0 && currentValue === 0) {
                             differenceClass = 'target-achieved';
                             rateClass = 'target-achieved';
                         }
                    }

                } else if (!isNaN(targetValue) && isNaN(currentValue)) { // Target set, but no current value
                    difference = `-${formatValue(targetValue)}`; // Show how much is missing
                    achievementRate = '0%';
                    rateClass = 'negative-change';
                    differenceClass = 'negative-change';
                } else { // Target not a number or current value missing etc.
                     difference = '-';
                     achievementRate = '-';
                }


                tableHTML += `<tr>
                                <td>${measurementLabels[key]}</td>
                                <td>${formatValue(targetValue)}</td>
                                <td>${formatValue(currentValue)}</td>
                                <td class="${rateClass}">${achievementRate}</td>
                                <td class="${differenceClass}">${difference}</td>
                               </tr>`;
            }
        }
        tableHTML += '</tbody></table>';
        targetComparisonContainer.innerHTML = tableHTML;
    }

    function renderCalendarView() {
        console.log("DEBUG: -> renderCalendarView 호출됨");
        if (!calendarViewMeasurementList || !countdownDisplay) {
            console.error("DEBUG: [오류!] Calendar view elements missing.");
            return;
        }
        if (measurements.length === 0) {
            clearCalendarView();
            countdownDisplay.innerHTML = '<p>측정 기록이 없어요.</p>';
            return;
        }

        try {
            // Extract dates, ensuring they are valid Date objects
            const dateList = measurements.map(m => {
                 let date = null;
                 const dateStr = m.date || m.timestamp;
                 if (dateStr) {
                    if (typeof dateStr === 'number') { // Handle timestamps
                         date = new Date(dateStr);
                    } else if (typeof dateStr === 'string') {
                        // Try parsing YYYY.MM.DD format first
                        const parts = dateStr.match(/(\d{4})\.*? *(\d{1,2})\.*? *(\d{1,2})\.?/);
                        if (parts) {
                            date = new Date(parseInt(parts[1]), parseInt(parts[2]) - 1, parseInt(parts[3]));
                        } else {
                            // Fallback to standard parsing (might handle ISO strings etc.)
                            date = new Date(dateStr);
                        }
                    }
                 }
                 return date && !isNaN(date.getTime()) ? date : null; // Return only valid dates
            }).filter(date => date !== null); // Filter out invalid/null dates

            if (dateList.length === 0) {
                 clearCalendarView();
                 countdownDisplay.innerHTML = '<p>유효한 측정 날짜가 없어요.</p>';
                 return;
            }

            dateList.sort((a, b) => a.getTime() - b.getTime()); // Sort dates chronologically

            // Display unique measurement dates in the list
            const uniqueDateStrings = [...new Set(dateList.map(date => date.toLocaleDateString('ko-KR')))];
            let listHTML = '<ul>';
            uniqueDateStrings.forEach(dateStr => {
                 const date = new Date(dateStr); // Re-parse for day of week
                 const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
                 listHTML += `<li>${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2,'0')}.${date.getDate().toString().padStart(2,'0')} (${dayOfWeek})</li>`;
             });
            listHTML += '</ul>';
            calendarViewMeasurementList.innerHTML = listHTML;

            // Countdown logic based on the latest valid date
            const lastDate = dateList[dateList.length - 1];
            const nextDate = new Date(lastDate.getTime());
            nextDate.setDate(lastDate.getDate() + 7); // Calculate next measurement date (7 days later)

            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normalize today to the start of the day

            const timeDiff = nextDate.getTime() - today.getTime();
            const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)); // Calculate remaining days

            const nextDateStr = `${nextDate.getFullYear()}.${(nextDate.getMonth() + 1).toString().padStart(2,'0')}.${nextDate.getDate().toString().padStart(2,'0')}`;
            if (daysRemaining > 1) {
                countdownDisplay.innerHTML = `<p>다음 측정 예정일: <strong>${nextDateStr}</strong> (${daysRemaining}일 남음)</p>`;
            } else if (daysRemaining === 1) {
                countdownDisplay.innerHTML = `<p>다음 측정 예정일: <strong>${nextDateStr}</strong> (내일!)</p>`;
            } else if (daysRemaining === 0) {
                countdownDisplay.innerHTML = `<p><strong>오늘은 측정하는 날입니다! (${nextDateStr})</strong> 💪</p>`;
            } else { // Measurement day has passed
                countdownDisplay.innerHTML = `<p>측정일(${nextDateStr})이 ${Math.abs(daysRemaining)}일 지났어요. 😥 어서 기록하세요!</p>`;
            }

            console.log("DEBUG: <- renderCalendarView 완료");
        } catch (e) {
            console.error(" renderCalendarView 오류:", e);
            calendarViewMeasurementList.innerHTML = '<p style="color: red;">달력 보기 렌더링 오류</p>';
            countdownDisplay.innerHTML = '<p style="color: red;">카운트다운 렌더링 오류</p>';
        }
    }

    function renderChartSelector() {
        console.log("DEBUG: -> renderChartSelector 호출됨");
        if (!chartSelector) { console.error("DEBUG: chartSelector 없음!"); return; }
        try {
            chartSelector.innerHTML = '';
            const selectableKeys = [...numericKeys]; // All numeric keys are selectable
            selectableKeys.forEach(key => {
                const btn = document.createElement('button');
                btn.textContent = measurementLabels[key] || key;
                btn.dataset.metric = key;
                if (selectedMetrics.includes(key)) {
                   btn.classList.add('active');
                }
                chartSelector.appendChild(btn);
            });
            console.log("DEBUG: <- renderChartSelector 완료");
        } catch (e) {
            console.error(" 차트 선택기 렌더링 오류:", e);
        }
    }

    function handleChartSelectorClick(event) {
        const btn = event.target.closest('button');
        if (!btn || !btn.dataset.metric) return;

        const key = btn.dataset.metric;
        console.log(`DEBUG: 차트 선택 버튼 클릭: ${key}`);

        const isActive = btn.classList.toggle('active');
        if (isActive) {
            if (!selectedMetrics.includes(key)) {
                selectedMetrics.push(key);
            }
        } else {
            selectedMetrics = selectedMetrics.filter(item => item !== key);
        }
        console.log("DEBUG: 현재 선택된 측정 항목:", selectedMetrics);
        renderChart();
    }

    function handleSelectAllCharts() {
        console.log("DEBUG: 차트 전체 선택");
        selectedMetrics = [...numericKeys]; // Select all numeric keys
        chartSelector.querySelectorAll('button').forEach(btn => {
            if (numericKeys.includes(btn.dataset.metric)) {
                btn.classList.add('active');
            } else {
                // Just in case there are non-numeric buttons somehow
                btn.classList.remove('active');
            }
        });
        renderChart();
    }

    function handleDeselectAllCharts() {
        console.log("DEBUG: 차트 전체 해제");
        selectedMetrics = [];
        chartSelector.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
        renderChart();
    }

    function renderChart() {
        console.log(`DEBUG: renderChart 호출됨 (선택 항목: ${selectedMetrics.join(', ')})`);
        if (!chartCanvas) { console.error("DEBUG: [오류!] chartCanvas 없음!"); return; }

        const ctx = chartCanvas.getContext('2d');
        if (!ctx) { console.error("Canvas context를 가져올 수 없습니다."); return; }

        // Destroy existing chart instance before creating a new one
        if (chartInstance) {
            console.log("DEBUG: 기존 차트 인스턴스 제거 시도");
            chartInstance.destroy();
            chartInstance = null;
            console.log("DEBUG: 기존 차트 인스턴스 제거 완료");
        }

        try {
            if (measurements.length === 0 || selectedMetrics.length === 0) {
                console.log("DEBUG: 차트 표시할 데이터 또는 선택 항목 없음.");
                clearChart(); // Display placeholder message
                return;
            }

            // Prepare labels using week and formatted date
             const labels = measurements.map((m, i) => {
                 const weekLabel = `${m.week !== undefined ? m.week : i}주차`;
                 const dateLabel = formatTimestamp(m.date || m.timestamp).split(' ')[0]; // Date only
                 return `${weekLabel}${dateLabel ? ` (${dateLabel})` : ''}`;
             });

             const chartColors = ['#FA58B6', '#7A0BC0', '#FFCAD4', '#87CEFA', '#90EE90', '#FFD700', '#F08080', '#a89cc8', '#DA70D6', '#40E0D0', '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];

             const datasets = selectedMetrics.map((key, index) => {
                const data = measurements.map(m => {
                    const value = m[key];
                    // Ensure only valid numbers or null are passed to the chart
                    return (value !== undefined && value !== null && value !== '') ? parseFloat(value) : null;
                });
                const color = chartColors[index % chartColors.length];
                return {
                    label: measurementLabels[key] || key,
                    data: data,
                    borderColor: color,
                    backgroundColor: color + '33', // Slightly transparent fill
                    tension: 0.2,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    fill: false, // Don't fill area under line by default
                    spanGaps: true, // Connect points across null values
                    borderWidth: 2,
                };
             });

            // Chart configuration
            const chartConfig = {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: datasets
                 },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                         y: {
                            beginAtZero: false, // Don't force Y axis to start at 0
                            ticks: { color: '#a89cc8' },
                            grid: { color: 'rgba(168, 156, 200, 0.2)' }
                        },
                        x: {
                            title: {
                                display: true,
                                text: '주차 (날짜)',
                                color: '#FFCAD4'
                             },
                            ticks: {
                                color: '#a89cc8',
                                // Display only week number on ticks for clarity
                                callback: function(value, index, values) {
                                     const label = this.getLabelForValue(value);
                                     return label.split(' ')[0]; // Extract "X주차" part
                                }
                            },
                            grid: { display: false } // Hide vertical grid lines
                        }
                     },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                color: '#a89cc8',
                                boxWidth: 12,
                                padding: 15
                            }
                        },
                         tooltip: {
                            mode: 'index', // Show tooltip for all datasets at that index
                            intersect: false, // Tooltip appears even if not hovering directly over point
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#FFCAD4',
                            bodyColor: '#FFFFFF',
                            callbacks: {
                                // Show full label (Week + Date) in tooltip title
                                title: function(tooltipItems) {
                                     if (tooltipItems.length > 0) {
                                         return tooltipItems[0].label; // Use the full label from chart data
                                    }
                                    return '';
                                },
                                // Optional: format tooltip body values
                                // label: function(context) {
                                //     let label = context.dataset.label || '';
                                //     if (label) { label += ': '; }
                                //     if (context.parsed.y !== null) {
                                //         label += formatValue(context.parsed.y);
                                //     }
                                //     return label;
                                // }
                            }
                        },
                        title: { display: false } // Hide overall chart title (using h3 instead)
                     },
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                }
            };
            chartInstance = new Chart(ctx, chartConfig);
            console.log("DEBUG: 새 차트 렌더링 완료");
        } catch (e) {
            console.error(" 차트 렌더링 오류:", e);
            ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
            ctx.font = "16px sans-serif";
            ctx.fillStyle = "red";
            ctx.textAlign = "center";
            ctx.fillText("차트를 표시하는 중 오류가 발생했습니다.", chartCanvas.width / 2, chartCanvas.height / 2);
        }
    }


    function renderAll() {
        console.log("DEBUG: === renderAll 호출됨 ===");
        try {
            console.log("DEBUG: 현재 measurements:", measurements.length, "개 / notes:", notes.length, "개");
            updateCurrentWeekDisplay();
            renderHistoryTable();
            renderPrevWeekComparisonTable();
            renderInitialComparisonTable();
            renderTargetComparisonTable();
            renderCalendarView();
            renderChartSelector();
            renderNotesList();

            // Only render chart if the chart tab is currently active
            const activeTabContent = document.querySelector('.tab-content[style*="display: block"]');
            const activeTabId = activeTabContent ? activeTabContent.id : null;

            if (activeTabId === 'tab-change-report') {
                console.log("DEBUG: 변화 보고서 탭 활성, 차트 렌더링 로직 실행");
                renderChart();
            } else {
                console.log("DEBUG: 변화 보고서 탭 비활성 상태, 차트 렌더링 건너뜀");
                // Optional: Clear chart if switching away from chart tab to free up memory
                // clearChart();
            }

            console.log("DEBUG: === renderAll 완료 ===");
        } catch (e) {
            console.error(` renderAll 실행 중 오류 발생: ${e.message}`, e.stack);
        }
    }


    function handleFormSubmit(event) {
        if (event) event.preventDefault();
        console.log("DEBUG: === handleFormSubmit 호출됨 ===");
        try {
            const editIndexStr = editIndexInput.value;
            const editIndex = editIndexStr !== '' && !isNaN(editIndexStr) ? parseInt(editIndexStr, 10) : -1;
            const isEditing = editIndex !== -1;
            console.log(`DEBUG: 수정 모드: ${isEditing}, 인덱스: ${editIndex}`);

            const currentMeasurement = {};
            let isValid = true;
            let firstInvalidField = null;

            // Populate currentMeasurement from form inputs
            [...numericKeys, ...textKeys].forEach(key => {
                const input = document.getElementById(key);
                if (input) {
                    let value = input.value.trim();
                    if (numericKeys.includes(key)) {
                         if (value !== '') {
                            const numValue = parseFloat(value);
                            // Validate numeric input (must be non-negative)
                            if (isNaN(numValue) || numValue < 0) {
                                isValid = false;
                                if (!firstInvalidField) firstInvalidField = input;
                                console.warn(`DEBUG: 유효하지 않은 숫자 입력 (${key}): ${value}`);
                                input.classList.add('invalid-input');
                            } else {
                                currentMeasurement[key] = numValue;
                                input.classList.remove('invalid-input');
                            }
                        } else {
                             currentMeasurement[key] = null; // Treat empty numeric fields as null
                             input.classList.remove('invalid-input');
                        }
                    } else { // Text keys
                        currentMeasurement[key] = value === '' ? null : value; // Treat empty text as null
                    }
                } else {
                    console.warn(`DEBUG: ID '${key}' 에 해당하는 입력 요소를 찾을 수 없습니다.`);
                }
            });

            // If validation fails, alert user and focus invalid field
            if (!isValid) {
                alert("유효하지 않은 숫자 입력이 있습니다. 빨간색으로 표시된 입력 필드를 확인해주세요. 숫자는 0 이상이어야 합니다.");
                if(firstInvalidField) firstInvalidField.focus();
                return;
            }

            console.log("DEBUG: 저장/수정될 데이터:", currentMeasurement);
            console.log("DEBUG: measurements 업데이트 전 길이:", measurements.length);

            if (isEditing) {
                // Update existing measurement
                if (editIndex >= 0 && editIndex < measurements.length) {
                    // Preserve existing week and date unless explicitly changed (not possible via form currently)
                    measurements[editIndex] = {
                        ...measurements[editIndex], // Keep existing week, date, etc.
                        ...currentMeasurement      // Overwrite with new form values
                    };
                    console.log(`DEBUG: 인덱스 ${editIndex} 업데이트됨`);
                } else {
                     console.error(`DEBUG: [오류!] 유효하지 않은 수정 인덱스: ${editIndex}`);
                     alert("기록을 수정하는 중 오류가 발생했습니다. 인덱스가 올바르지 않습니다.");
                     return;
                }
            } else {
                // Add new measurement
                currentMeasurement.week = measurements.length; // Assign next week number
                // Assign current date and time (timestamp more reliable)
                currentMeasurement.timestamp = Date.now();
                currentMeasurement.date = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }); // Also store formatted date string
                measurements.push(currentMeasurement);
                console.log("DEBUG: 새 데이터 추가됨");
            }

            console.log("DEBUG: measurements 업데이트 후 길이:", measurements.length);
            savePrimaryDataToStorage();
            resetFormState();
            renderAll();
            showPopup(isEditing ? "측정 기록 수정 완료! ✨" : "측정 기록 저장 완료! 🎉");
            console.log("DEBUG: === handleFormSubmit 성공 ===");

        } catch (e) {
            console.error(" handleFormSubmit 오류:", e);
            alert(`측정 기록을 저장/수정하는 중 오류가 발생했습니다: ${e.message}`);
        }
    }

    function handleDeleteMeasurement(index) {
        if (index === undefined || index === null || index < 0 || index >= measurements.length) {
            console.error(`DEBUG: [오류!] 유효하지 않은 삭제 인덱스: ${index}`);
            alert("삭제할 기록을 찾을 수 없습니다.");
            return;
        }

        const entryToDelete = measurements[index];
        const displayDate = formatTimestamp(entryToDelete.date || entryToDelete.timestamp).split(' ')[0]; // Date only
        if (confirm(`${entryToDelete.week}주차 (${displayDate}) 기록을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
            try {
                measurements.splice(index, 1);
                // Re-index subsequent entries
                measurements.forEach((entry, i) => {
                    entry.week = i;
                });
                savePrimaryDataToStorage();
                renderAll();
                resetFormState(); // Clear form if deleted entry was being edited
                showPopup("측정 기록 삭제 완료 👍");
                console.log(`DEBUG: 인덱스 ${index} 기록 삭제 및 주차 재정렬 완료`);
            } catch (e) {
                 console.error(` 인덱스 ${index} 삭제 중 오류:`, e);
                 alert("기록 삭제 중 오류가 발생했습니다.");
            }
        }
    }

    function handleEditClick(index) {
        if (index === undefined || index === null || index < 0 || index >= measurements.length) {
            console.error(`DEBUG: [오류!] 유효하지 않은 수정 인덱스: ${index}`);
            alert("수정할 기록을 찾을 수 없습니다.");
            return;
        }
        console.log(`DEBUG: 수정 버튼 클릭: 인덱스 ${index}`);
        const entry = measurements[index];

        // Populate form with data from the selected entry
        [...numericKeys, ...textKeys].forEach(key => {
             const input = document.getElementById(key);
             if (input) {
                 input.value = entry[key] !== undefined && entry[key] !== null ? entry[key] : '';
                 input.classList.remove('invalid-input'); // Clear validation state
             }
        });

        // Set form state to editing mode
        editIndexInput.value = index;
        formTitle.textContent = `측정 기록 수정 (${entry.week}주차)`;
        saveUpdateBtn.textContent = '수정 완료';
        if (cancelEditBtn) cancelEditBtn.style.display = 'inline-block';

        // Switch to input tab and scroll form into view
        const inputTabButton = tabBar ? tabBar.querySelector('button[data-tab="tab-input"]') : null;
        if (inputTabButton) {
            inputTabButton.click(); // Activate the input tab
            // Use setTimeout to ensure tab content is visible before scrolling
            setTimeout(() => {
                 if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
                 // Optional: focus first input field
                 const firstInput = form.querySelector('input[type="number"], input[type="text"], textarea');
                 if (firstInput) firstInput.focus();
             }, 100);
        }
    }

    function cancelEdit() {
        console.log("DEBUG: 수정 취소");
        resetFormState();
    }

    function resetFormState() {
        console.log("DEBUG: 폼 상태 초기화");
        if (form) form.reset(); // Reset form fields
        editIndexInput.value = ''; // Clear edit index (use empty string for hidden input)
        formTitle.textContent = `새 측정 기록 (현재 ${measurements.length}주차)`; // Update title
        saveUpdateBtn.textContent = '기록하기 ✨'; // Reset button text
        if (cancelEditBtn) cancelEditBtn.style.display = 'none'; // Hide cancel button
        // Clear validation states
        [...numericKeys, ...textKeys].forEach(key => {
             const input = document.getElementById(key);
             if (input) {
                 input.classList.remove('invalid-input');
             }
        });
        console.log("DEBUG: 폼 상태 초기화 완료");
    }

    function handleTargetFormSubmit(event) {
        event.preventDefault();
        console.log("DEBUG: === handleTargetFormSubmit 호출됨 ===");
        const newTargets = {};
        let isValid = true;
        let firstInvalidField = null;
        numericKeys.forEach(key => {
            const input = document.getElementById(`target_${key}`);
            if (input) {
                const value = input.value.trim();
                if (value !== '') {
                    const numValue = parseFloat(value);
                    // Validate target value (must be non-negative)
                     if (isNaN(numValue) || numValue < 0) {
                        isValid = false;
                         if (!firstInvalidField) firstInvalidField = input;
                        input.classList.add('invalid-input');
                        console.warn(`DEBUG: 유효하지 않은 목표 값 (${key}): ${value}`);
                    } else {
                        newTargets[key] = numValue;
                         input.classList.remove('invalid-input');
                    }
                } else {
                    newTargets[key] = null; // Treat empty target as null (or undefined?)
                    input.classList.remove('invalid-input');
                }
            }
        });

        if (!isValid) {
            alert("유효하지 않은 목표 값이 있습니다. 빨간색으로 표시된 필드를 확인해주세요. 목표 값은 0 이상이어야 합니다.");
            if(firstInvalidField) firstInvalidField.focus();
            return;
        }

        targets = newTargets; // Update targets object
        savePrimaryDataToStorage(); // Save updated targets
        renderAll(); // Re-render tables (especially target comparison)
        showPopup("목표 저장 완료! 👍");
        console.log("DEBUG: 목표 저장 완료:", targets);
    }

    function handleResetData() {
        if (confirm("정말로 모든 측정 기록, 목표, 메모를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다!")) {
            if (confirm("다시 한 번 확인합니다. 모든 데이터가 영구적으로 삭제됩니다. 계속하시겠습니까?")) {
                try {
                    localStorage.removeItem(PRIMARY_DATA_KEY); // Clear storage
                    // Reset in-memory state
                    measurements = [];
                    targets = {};
                    notes = [];
                    selectedMetrics = ['weight']; // Reset chart selection
                    currentNoteSortOrder = 'newest'; // Reset note sort order

                    resetFormState(); // Reset input form
                    handleCancelEditNote(); // Reset note form

                    populateTargetInputs(); // Clear target inputs
                    renderAll(); // Re-render everything (will show empty states)
                    showPopup("모든 데이터가 초기화되었습니다. ✨");
                    console.log("DEBUG: 모든 데이터 초기화 완료");
                } catch (e) {
                    console.error(" 데이터 초기화 중 오류 발생:", e);
                    alert("데이터를 초기화하는 중 오류가 발생했습니다.");
                }
            }
        }
    }


    function handleSaveNote() {
        console.log("DEBUG: === handleSaveNote 호출됨 ===");
        if (!noteTitleInput || !noteContentInput || !editNoteIdInput || !noteFormTitle || !saveNoteButton || !cancelEditNoteBtn) {
            console.error("DEBUG: [오류!] 메모 관련 DOM 요소를 찾을 수 없습니다.");
            return;
        }

        const title = noteTitleInput.value.trim();
        const content = noteContentInput.value.trim();
        const editingNoteIdStr = editNoteIdInput.value;
        const editingNoteId = editingNoteIdStr ? parseInt(editingNoteIdStr, 10) : null;

        if (!title && !content) {
            alert("메모 제목이나 내용을 입력해주세요!");
            noteContentInput.focus();
            return;
        }

        try {
            if (editingNoteId !== null && !isNaN(editingNoteId)) {
                // Edit existing note
                const noteIndex = notes.findIndex(n => n.id === editingNoteId);
                if (noteIndex > -1) {
                    notes[noteIndex].title = title || "제목 없음"; // Use default if title empty
                    notes[noteIndex].content = content;
                    notes[noteIndex].updatedAt = Date.now(); // Update timestamp
                    console.log(`DEBUG: 메모 수정 완료 (ID: ${editingNoteId})`);
                } else {
                    console.error(`DEBUG: [오류!] 수정할 메모를 찾지 못했습니다 (ID: ${editingNoteId})`);
                    alert("메모를 수정하는 중 오류가 발생했습니다. 해당 메모를 찾을 수 없습니다.");
                    handleCancelEditNote(); // Reset form if note not found
                    return;
                }
            } else {
                // Add new note
                const newNote = {
                    id: Date.now(), // Use timestamp as unique ID
                    createdAt: Date.now(),
                    updatedAt: null, // No update yet
                    title: title || "제목 없음",
                    content: content
                };
                notes.push(newNote);
                console.log(`DEBUG: 새 메모 추가 완료 (ID: ${newNote.id})`);
            }

            savePrimaryDataToStorage();
            handleCancelEditNote(); // Reset form after save/edit
            renderNotesList(); // Update note list display
            showPopup(editingNoteId ? "메모 수정 완료! ✨" : "새 메모 저장 완료! 🎉");
        } catch (e) {
            console.error(" 메모 저장/수정 오류:", e);
            alert(`메모를 저장하는 중 오류가 발생했습니다: ${e.message}`);
        }
    }

    function handleEditNoteStart(noteId) {
        console.log(`DEBUG: 메모 수정 시작: ID ${noteId}`);
        if (!noteTitleInput || !noteContentInput || !editNoteIdInput || !noteFormTitle || !saveNoteButton || !cancelEditNoteBtn) {
             console.error("DEBUG: [오류!] 메모 수정 시작 위한 DOM 요소 누락");
             return;
        }
        const note = notes.find(n => n.id === noteId);
        if (!note) {
            console.error(`DEBUG: [오류!] 수정할 메모 찾기 실패 (ID: ${noteId})`);
            alert("수정할 메모를 찾을 수 없습니다.");
            return;
        }

        // Populate note form
        noteTitleInput.value = note.title === "제목 없음" ? "" : note.title; // Don't show "제목 없음" in input
        noteContentInput.value = note.content;
        editNoteIdInput.value = note.id; // Set hidden input with note ID

        // Update form UI for editing state
        noteFormTitle.textContent = '메모 수정하기';
        saveNoteButton.textContent = '수정 완료';
        cancelEditNoteBtn.style.display = 'inline-block'; // Show cancel button

        // Scroll form into view and focus
        if (noteFormArea) {
            noteFormArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setTimeout(() => noteTitleInput.focus(), 300); // Focus after scroll animation
        }
    }

    function handleCancelEditNote() {
        console.log("DEBUG: 메모 수정/작성 취소");
        if (!noteTitleInput || !noteContentInput || !editNoteIdInput || !noteFormTitle || !saveNoteButton || !cancelEditNoteBtn) {
             console.error("DEBUG: [오류!] 메모 폼 초기화 위한 DOM 요소 누락");
             return;
         }
        // Reset form fields
        noteTitleInput.value = '';
        noteContentInput.value = '';
        editNoteIdInput.value = ''; // Clear hidden ID input

        // Reset form UI to default state
        noteFormTitle.textContent = '새 메모 작성하기';
        saveNoteButton.textContent = '메모 저장';
        cancelEditNoteBtn.style.display = 'none'; // Hide cancel button
        console.log("DEBUG: 메모 폼 초기화 완료");
    }

    function handleDeleteNote(noteId) {
        console.log(`DEBUG: 메모 삭제 시도: ID ${noteId}`);
        const noteIndex = notes.findIndex(n => n.id === noteId);
        if (noteIndex < 0) {
            console.error(`DEBUG: [오류!] 삭제할 메모 찾기 실패 (ID: ${noteId})`);
            alert("삭제할 메모를 찾을 수 없습니다.");
            return;
        }

        const noteTitle = notes[noteIndex].title;
        if (confirm(`"${noteTitle}" 메모를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
            try {
                 notes.splice(noteIndex, 1); // Remove note from array
                 savePrimaryDataToStorage();
                 renderNotesList(); // Update list display
                 showPopup("메모 삭제 완료 👍");
                 console.log(`DEBUG: 메모 삭제 완료 (ID: ${noteId})`);
                 // If the deleted note was being edited, reset the form
                 if (editNoteIdInput.value && parseInt(editNoteIdInput.value, 10) === noteId) {
                     handleCancelEditNote();
                 }
            } catch (e) {
                 console.error(` 메모 (ID: ${noteId}) 삭제 중 오류:`, e);
                 alert("메모 삭제 중 오류가 발생했습니다.");
            }
        }
    }


    function sortNotes(notesArray, order = 'newest') {
        // Create a copy before sorting to avoid modifying the original array directly
        return [...notesArray].sort((a, b) => {
            // Use createdAt timestamp if available, otherwise fallback to id (which is also a timestamp)
            const timeA = a.createdAt || a.id || 0;
            const timeB = b.createdAt || b.id || 0;
            return order === 'newest' ? timeB - timeA : timeA - timeB; // Sort descending for newest, ascending for oldest
        });
    }


    function renderNotesList() {
        console.log("DEBUG: -> renderNotesList 호출됨, 정렬:", currentNoteSortOrder);
        if (!notesListContainer) {
             console.error("DEBUG: [오류!] notesListContainer 요소 없음!");
             return;
        }
        if (!Array.isArray(notes) || notes.length === 0) {
            clearNotesList(); // Show empty message
            return;
        }

        try {
			const sortedNotes = sortNotes(notes, currentNoteSortOrder); // Sort notes based on current selection
			let listHTML = '';
			sortedNotes.forEach(note => {
                // Generate preview text (limit length, handle newlines)
				const previewLength = 100;
				const previewContent = note.content.length > previewLength
					? note.content.substring(0, previewLength).replace(/\n/g, ' ') + '...'
					: note.content.replace(/\n/g, ' ');

                // Format timestamps
                const createdStr = formatTimestamp(note.createdAt || note.id);
                const updatedStr = note.updatedAt ? formatTimestamp(note.updatedAt) : '';

				listHTML += `
				<div class="note-item" data-note-id="${note.id}">
					<h4>${note.title}</h4>
					<div class="note-date">
						작성: ${createdStr}
						${updatedStr ? `<span class="note-updated">(수정: ${updatedStr})</span>` : ''}
					</div>
					<div class="note-content-preview">${previewContent || '(내용 없음)'}</div>
					<div class="note-actions">
						<button class="btn btn-note-edit" data-id="${note.id}">수정</button>
						<button class="btn btn-note-delete" data-id="${note.id}">삭제</button>
					</div>
                </div>`;
            });
            notesListContainer.innerHTML = listHTML;
            console.log("DEBUG: <- renderNotesList 완료");
        } catch (e) {
            console.error(" 메모 목록 렌더링 오류:", e);
            notesListContainer.innerHTML = '<p style="color: red;">메모 목록을 불러오는 중 오류가 발생했습니다.</p>';
        }
    }

    // ----- 스크롤 리스너 설정 함수 시작 -----
    function setupScrollListener() {
        // 스크롤 리스너 내부에서 사용할 tabBar 요소를 가져옵니다.
        const localTabBar = document.querySelector('.tab-bar'); // Use local variable to avoid potential scope issues if tabBar isn't available globally yet
        if (!localTabBar) {
            console.warn("DEBUG: [Scroll Listener] Tab bar not found during setup.");
            return; // tabBar 없으면 설정 중단
        }

        const scrollThreshold = window.innerHeight * 0.15; // 화면 높이의 15% (조절 가능)
        const nearTopThreshold = 50; // 화면 최상단으로 간주할 픽셀 값 (조절 가능)

        // 스크롤 이벤트 리스너 추가
        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;
            // 스크롤 방향 감지에 약간의 버퍼를 둠 (1px 이상 움직였을 때만 방향 감지)
            const scrollDelta = currentScrollY - lastScrollY;
            const isScrollingDown = scrollDelta > 1;
            const isScrollingUp = scrollDelta < -1;

            // --- 상태 변경 로직 ---
            if (isScrollingDown && currentScrollY > scrollThreshold && !isTabBarCollapsed) {
                // [축소] 아래로 스크롤 & 임계점 넘음 & 아직 축소 안됨
                localTabBar.classList.add('collapsed');
                isTabBarCollapsed = true;
                // console.log("DEBUG: Tab bar collapsed"); // 디버그 완료 후 주석 처리 가능
            } else if (isScrollingUp && currentScrollY <= scrollThreshold && isTabBarCollapsed) {
                // [확장] 위로 스크롤 & 임계점 이하 & 현재 축소됨
                localTabBar.classList.remove('collapsed');
                isTabBarCollapsed = false;
                // console.log("DEBUG: Tab bar expanded"); // 디버그 완료 후 주석 처리 가능
            } else if (currentScrollY < nearTopThreshold && isTabBarCollapsed) {
                // [확장] 화면 최상단 근처 & 현재 축소됨 (스크롤 방향 무관)
                localTabBar.classList.remove('collapsed');
                isTabBarCollapsed = false;
                // console.log("DEBUG: Tab bar expanded (near top)"); // 디버그 완료 후 주석 처리 가능
            }
            // --- 로직 끝 ---

            // 마지막 스크롤 위치 업데이트 (의미있는 움직임이 있을 때만 또는 맨 위로 갔을 때)
            if (Math.abs(scrollDelta) > 1 || currentScrollY === 0) {
                 lastScrollY = currentScrollY <= 0 ? 0 : currentScrollY;
            }
        }, { passive: true }); // 스크롤 성능 향상을 위해 passive 옵션 추가

        console.log("DEBUG: 스크롤 기반 탭 바 숨김 리스너 추가됨 (수정됨)");
    }
    // ----- 스크롤 리스너 설정 함수 끝 -----


    console.log("DEBUG: 함수 정의 완료");


    // ===============================================
    // 애플리케이션 초기화 (Initialization)
    // ===============================================
    console.log("DEBUG: 애플리케이션 초기화 시작");
    try {
        loadAllData(); // Load data from storage first
        setupTargetInputs(); // Setup target form structure
        populateTargetInputs(); // Fill target form with loaded data

        // Activate the first tab by default
        const initialTab = tabBar ? tabBar.querySelector('.tab-button') : null;
        if (initialTab) {
             initialTab.click(); // Simulate click on the first tab button
        } else if (tabContents.length > 0) {
            // Fallback if no tab bar: show first content section
            tabContents.forEach((content, index) => {
                 content.style.display = index === 0 ? 'block' : 'none';
            });
        }

        renderAll(); // Initial render of all components

        console.log("DEBUG: 애플리케이션 초기화 완료");
    } catch (initError) {
        console.error(" 애플리케이션 초기화 중 심각한 오류 발생:", initError);
        alert("애플리케이션을 초기화하는 중 오류가 발생했습니다. 페이지를 새로고침하거나 데이터를 초기화해야 할 수 있습니다.");
    }

    // ===============================================
    // 이벤트 리스너 설정 (Event Listener Setup)
    // ===============================================
    console.log("DEBUG: 이벤트 리스너 설정 시작");
    try {
        // Tab Bar Navigation
        if (tabBar) {
            console.log("DEBUG: tabBar 리스너 추가");
            tabBar.addEventListener('click', (e) => {
                const button = e.target.closest('.tab-button');
                if (button && button.dataset.tab) {
                    const targetTabId = button.dataset.tab;
                    console.log(`DEBUG: 탭 버튼 클릭됨: ${targetTabId}`);
                    try {
                        // Deactivate all buttons and content
                        tabBar.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                        tabContents.forEach(content => content.style.display = 'none');

                        // Activate clicked button and corresponding content
                        button.classList.add('active');
                        const targetContent = document.getElementById(targetTabId);
                        if (targetContent) {
                            targetContent.style.display = 'block';
                            console.log(`DEBUG: ${targetTabId} 활성화 완료`);

                             // Special actions for specific tabs when activated
                             if (targetTabId === 'tab-change-report') {
                                console.log("DEBUG: 변화 보고서 탭 활성화, 차트 렌더링");
                                renderChart(); // Render chart specifically when this tab is shown
                            } else if (targetTabId === 'tab-overview') {
                                console.log("DEBUG: 개요 탭 활성화, 메모 목록 렌더링");
                                renderNotesList(); // Re-render notes when this tab is shown
                            } else if (targetTabId === 'tab-calendar') {
                                 renderCalendarView(); // Re-render calendar view when shown
                            } else if (targetTabId === 'tab-history') {
                                 renderHistoryTable(); // Re-render history table when shown
                            }

                        } else {
                             console.error(`DEBUG: [오류!] ID '${targetTabId}' 에 해당하는 탭 컨텐츠 없음!`);
                        }
                    } catch (tabSwitchError) {
                        console.error(" 탭 전환 중 오류:", tabSwitchError);
                    }
                }
            });
        } else { console.error("DEBUG: [오류!] tabBar 요소 없음!"); }

        // Measurement Form Submit
        if (form) {
            form.addEventListener('submit', handleFormSubmit);
            console.log("DEBUG: 측정 기록 폼 제출 리스너 추가됨");
        } else { console.error("DEBUG: [오류!] 측정 기록 폼 없음!"); }

        // Cancel Edit Measurement Button
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', cancelEdit);
            console.log("DEBUG: 측정 수정 취소 버튼 리스너 추가됨");
        }

        // Target Form Submit
        if (targetForm) {
            targetForm.addEventListener('submit', handleTargetFormSubmit);
            console.log("DEBUG: 목표 폼 제출 리스너 추가됨");
        } else { console.error("DEBUG: [오류!] 목표 폼 없음!"); }

        // Reset Data Button
        if (resetDataButton) {
            resetDataButton.addEventListener('click', handleResetData);
            console.log("DEBUG: 데이터 리셋 버튼 리스너 추가됨");
        }

        // Export Data Button
        if (exportDataButton) {
            exportDataButton.addEventListener('click', exportMeasurementData);
            console.log("DEBUG: 데이터 내보내기 버튼 리스너 추가됨");
        }

        // Import Data Button & Input
        if (importDataButton && importFileInput) {
            importDataButton.addEventListener('click', () => importFileInput.click()); // Trigger file input click
            console.log("DEBUG: 데이터 가져오기 버튼 리스너 추가됨");
        }
        if (importFileInput) {
            importFileInput.addEventListener('change', importMeasurementData); // Handle file selection
            console.log("DEBUG: 파일 입력 변경 리스너 추가됨");
        }

        // History Table Edit/Delete Buttons (Event Delegation)
        if (historyContainer) {
            historyContainer.addEventListener('click', (e) => {
                const editButton = e.target.closest('.btn-edit');
                const deleteButton = e.target.closest('.btn-delete');

                if (editButton && editButton.dataset.index !== undefined) {
                    handleEditClick(parseInt(editButton.dataset.index, 10));
                } else if (deleteButton && deleteButton.dataset.index !== undefined) {
                    handleDeleteMeasurement(parseInt(deleteButton.dataset.index, 10));
                }
            });
            console.log("DEBUG: 측정 기록 테이블 이벤트 위임 리스너 추가됨");
        } else { console.error("DEBUG: [오류!] historyContainer 요소 없음!"); }

        // Save Note Button
        if (saveNoteButton) {
             saveNoteButton.addEventListener('click', handleSaveNote);
             console.log("DEBUG: 메모 저장 버튼 리스너 추가됨");
        } else { console.error("DEBUG: [오류!] 메모 저장 버튼 없음!"); }

        // Cancel Edit Note Button
        if (cancelEditNoteBtn) {
             cancelEditNoteBtn.addEventListener('click', handleCancelEditNote);
             console.log("DEBUG: 메모 수정 취소 버튼 리스너 추가됨");
        }

        // Note Sort Order Select
        if (noteSortOrderSelect) {
             noteSortOrderSelect.addEventListener('change', (e) => {
                 currentNoteSortOrder = e.target.value;
                 console.log(`DEBUG: 메모 정렬 순서 변경됨: ${currentNoteSortOrder}`);
                 renderNotesList(); // Re-render notes with new sort order
             });
             console.log("DEBUG: 메모 정렬 순서 변경 리스너 추가됨");
        }

        // Notes List Edit/Delete Buttons (Event Delegation)
        if (notesListContainer) {
            notesListContainer.addEventListener('click', (e) => {
                const editBtn = e.target.closest('.btn-note-edit');
                const deleteBtn = e.target.closest('.btn-note-delete');

                if (editBtn && editBtn.dataset.id) {
                    handleEditNoteStart(parseInt(editBtn.dataset.id, 10));
                } else if (deleteBtn && deleteBtn.dataset.id) {
                    handleDeleteNote(parseInt(deleteBtn.dataset.id, 10));
                }
            });
            console.log("DEBUG: 메모 목록 이벤트 위임 리스너 추가됨");
        } else { console.error("DEBUG: [오류!] notesListContainer 요소 없음!"); }

        // Chart Selector Buttons (Event Delegation)
        if (chartSelector) {
            chartSelector.addEventListener('click', handleChartSelectorClick);
             console.log("DEBUG: 차트 선택 버튼 이벤트 위임 리스너 추가됨");
        } else { console.error("DEBUG: [오류!] chartSelector 요소 없음!"); }

        // Chart Bulk Action Buttons
        if (selectAllChartsBtn) {
             selectAllChartsBtn.addEventListener('click', handleSelectAllCharts);
             console.log("DEBUG: 차트 전체 선택 버튼 리스너 추가됨");
        }
        if (deselectAllChartsBtn) {
             deselectAllChartsBtn.addEventListener('click', handleDeselectAllCharts);
             console.log("DEBUG: 차트 전체 해제 버튼 리스너 추가됨");
        }

        // ----- 스크롤 리스너 설정 함수 호출 -----
        setupScrollListener();
        // ----- 호출 끝 -----

        console.log("DEBUG: 모든 이벤트 리스너 설정 완료 (또는 시도)");

    } catch (listenerError) {
        console.error(" 이벤트 리스너 설정 중 오류 발생:", listenerError);
        alert("페이지 인터랙션 설정 중 오류가 발생했습니다. 일부 기능이 작동하지 않을 수 있습니다.");
    }

}); // DOMContentLoaded 끝
