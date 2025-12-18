// wpm.js - Typing Speed Test с подобрен автоскрол
const WPM_WORD_LENGTH = 5;
const DEFAULT_TIME_SECONDS = 600;
const INITIAL_BUFFER_CHAR = '<span class="buffer-char">&nbsp;</span>';
let REFERENCE_TEXT = null;
let REFERENCE_CHARS = [];
const textInput = document.getElementById('textInput');
const timerInput = document.getElementById('timerInput');
const charCountDisplay = document.getElementById('charCount');
const correctCharCountDisplay = document.getElementById('correctCharCount');
const errorCountDisplay = document.getElementById('errorCount');
const wpmCountDisplay = document.getElementById('wpmCount');
const testStatusDisplay = document.getElementById('testStatus');
const resetButton = document.getElementById('resetButton');
const referenceTextDisplay = document.getElementById('referenceText');
const downloadButton = document.getElementById('downloadButton');
const fileUpload = document.getElementById('fileUpload');
const wordCountDisplay = document.getElementById('wordCountDisplay');
const statsContainer = document.querySelector('.stats-container');
let isTimerRunning = false;
let startTime = 0;
let timerInterval = null;
let selectedTime = DEFAULT_TIME_SECONDS;
let remainingTime = selectedTime;
let correctChars = 0;
let errors = 0;

// Парсинг на времевия формат (минути:секунди, минути, ∞, ♾️)
function parseTimeInput(inputString) {
    const cleanedInput = inputString.toLowerCase().trim();
    if (cleanedInput === '∞' || cleanedInput === '0:00' || cleanedInput === '0' || cleanedInput === 'без ограничение' || cleanedInput === '♾️') {
        return 0;
    }
    const parts = cleanedInput.split(':');
    let totalSeconds = 0;
    if (parts.length === 2) {
        const minutes = parseInt(parts[0]) || 0;
        const seconds = parseInt(parts[1]) || 0;
        totalSeconds = (minutes * 60) + seconds;
    } else if (parts.length === 1 && !isNaN(parseInt(cleanedInput))) {
        const minutes = parseInt(cleanedInput);
        totalSeconds = minutes * 60;
    }
    return Math.min(3600, Math.max(0, totalSeconds));
}

// Форматиране на времето MM:SS или ♾️
function formatTime(totalSeconds) {
    if (selectedTime === 0 && totalSeconds < 0) {
        return "♾️";
    }
    const absSeconds = Math.abs(totalSeconds);
    const minutes = Math.floor(absSeconds / 60);
    const seconds = absSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Актуализиране на времето от input полето
function updateTimeFromInput() {
    selectedTime = parseTimeInput(timerInput.value);
    if (selectedTime === 0) {
        remainingTime = 0;
        timerInput.value = "♾️";
        timerInput.classList.add('no-limit');
    } else {
        remainingTime = selectedTime;
        timerInput.value = formatTime(remainingTime);
        timerInput.classList.remove('no-limit');
    }
}

// Показване/скриване на бутона за сваляне
function setDownloadButtonState(isActive) {
    if (!downloadButton) return;
    downloadButton.style.display = isActive ? 'inline-block' : 'none';
    downloadButton.disabled = !isActive;
}

// Нормализиране на текста (премахване на специални символи)
function normalizeText(text) {
    let cleanText = text;
    cleanText = cleanText.replace(/\ufeff/g, '').replace(/\u00a0/g, ' ');
    cleanText = cleanText.replace(/\r/g, '');
    cleanText = cleanText.replace(/[„“”’]/g, '"');
    cleanText = cleanText.replace(/\n/g, ' ');
    cleanText = cleanText.replace(/[\u2014\u2013]/g, '-');
    return cleanText;
}

// Задаване на референтния текст
function setReferenceText(text) {
    REFERENCE_TEXT = normalizeText(text).replace(/[ \t]+/g, ' ').trim();
    if (REFERENCE_TEXT) {
        const wordCount = REFERENCE_TEXT.split(/\s+/).filter(word => word.length > 0).length;
        wordCountDisplay.textContent = wordCount;
    } else {
        wordCountDisplay.textContent = '0';
    }
    resetTest();
}

// Парсинг на DOCX файлове с mammoth.js
function parseDocx(file) {
    testStatusDisplay.textContent = 'Обработка на DOCX...';
    testStatusDisplay.className = 'status-running';
    const reader = new FileReader();
    reader.onload = (e) => {
        mammoth.extractRawText({ arrayBuffer: e.target.result })
            .then(result => {
                setReferenceText(result.value);
            })
            .catch(error => {
                alert('Грешка при четене на DOCX файла.');
                REFERENCE_TEXT = null;
                resetTest();
            });
    };
    reader.readAsArrayBuffer(file);
}

// Парсинг на PDF файлове с pdf.js
function parsePdf(file) {
    testStatusDisplay.textContent = 'Обработка на PDF...';
    testStatusDisplay.className = 'status-running';
    const reader = new FileReader();
    reader.onload = function () {
        const pdfData = new Uint8Array(reader.result);
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js';
        pdfjsLib.getDocument({ data: pdfData }).promise.then(pdf => {
            const numPages = pdf.numPages;
            const pagePromises = [];
            for (let i = 1; i <= numPages; i++) {
                pagePromises.push(
                    pdf.getPage(i).then(page => page.getTextContent()).then(content => content.items.map(item => item.str).join(' '))
                );
            }
            Promise.all(pagePromises).then(texts => {
                setReferenceText(texts.join('\n'));
            }).catch(error => {
                alert('Грешка при извличане на текст от PDF.');
                REFERENCE_TEXT = null;
                resetTest();
            });
        });
    };
    reader.readAsArrayBuffer(file);
}

// Парсинг на TXT файлове
function parseTxt(file) {
    const reader = new FileReader();
    if (file.size === 0) {
        alert('Файлът е празен.');
        REFERENCE_TEXT = null;
        resetTest();
        return;
    }
    reader.onload = (e) => setReferenceText(e.target.result);
    reader.readAsText(file, 'UTF-8');
}

// Обработка на качени файлове (.txt, .docx, .pdf)
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
    REFERENCE_TEXT = null;
    resetTest();
    if (fileExtension === '.txt') parseTxt(file);
    else if (fileExtension === '.docx') parseDocx(file);
    else if (fileExtension === '.pdf') parsePdf(file);
    else {
        alert('Неподдържан файлов формат.');
        fileUpload.value = '';
    }
}

// Експортиране на резултатите като .doc файл
function exportText() {
    if (!downloadButton || downloadButton.disabled || !REFERENCE_TEXT) return;
    const rawTextWithBuffer = normalizeText(textInput.innerText);
    const text = rawTextWithBuffer.startsWith(' ') ? rawTextWithBuffer.substring(1) : rawTextWithBuffer;
    const statsHTML = `
        <h2>Резултати от теста</h2>
        <p>Дата: ${new Date().toLocaleString('bg-BG')}</p>
        <p>WPM: ${wpmCountDisplay.textContent}</p>
        <p>Точност: ${correctCharCountDisplay.textContent} от ${charCountDisplay.textContent}</p>
        <p>Грешки: ${errorCountDisplay.textContent}</p>
        <hr>
        <h3>Въведен текст:</h3>
        <pre>${text}</pre>
    `;
    const blob = new Blob([statsHTML], { type: 'application/msword' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `WPM_Result_${new Date().toISOString().slice(0, 10)}.doc`;
    a.click();
}

// ✅ ИНИЦИАЛИЗАЦИЯ С ПОДОБРЕНО СКРОЛ ПОНАСЯНЕ
function initReferenceText() {
    const container = referenceTextDisplay.parentElement;
    container.style.overflow = 'auto';
    container.style.scrollBehavior = 'smooth';

    // ФИКСИРАНЕ НА НАЧАЛОТО - винаги започваме от горе
    container.scrollTop = 0;

    container.addEventListener('wheel', e => e.preventDefault(), { passive: false });
    container.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

    if (!REFERENCE_TEXT) {
        referenceTextDisplay.innerHTML = '<p>Качете текстов файл.</p>';
        textInput.contentEditable = 'false';
        return;
    }
    REFERENCE_CHARS = REFERENCE_TEXT.split('');
    referenceTextDisplay.innerHTML = REFERENCE_CHARS.map((char, index) => {
        const content = char === '\n' ? '↵\n' : char;
        return `<span id="ref-char-${index}">${content}</span>`;
    }).join('');
    highlightReferenceChar(0, 'next-char-ref');
    textInput.contentEditable = 'true';
    textInput.innerHTML = INITIAL_BUFFER_CHAR;
    textInput.focus();
}

// Маркиране на символ в референтния текст
function highlightReferenceChar(index, className) {
    const charSpan = document.getElementById(`ref-char-${index}`);
    if (charSpan) {
        charSpan.classList.remove('next-char-ref', 'correct-char-ref', 'incorrect-char-ref');
        charSpan.classList.add(className);
    }
}

// ✅ НАЙ-КОНСЕРВАТИВНА ВЕРСИЯ НА АВТОСКРОЛА
function autoScrollReferenceText(nextIndex) {
    const nextCharSpan = document.getElementById(`ref-char-${nextIndex}`);
    if (!nextCharSpan || nextIndex < 50) return; // Няма скрол за първите 50 символа

    const container = referenceTextDisplay.parentElement;
    const containerHeight = container.offsetHeight;
    const currentScrollTop = container.scrollTop;
    const viewportBottom = currentScrollTop + containerHeight;

    const spanTop = nextCharSpan.offsetTop;

    // ✅ Скролваме САМО ако символът е 100% невидим ДОЛУ
    if (spanTop > viewportBottom - 50) {
        // Само +30px движение - много леко!
        container.scrollTop += 30;
    }
}

// Актуализиране на статистики и подсветка
function updateStatsAndHighlight() {
    if (!REFERENCE_TEXT) return;
    const selection = window.getSelection();
    let cursorOffsetFromEnd = 0;
    if (selection.rangeCount > 0 && textInput.contains(selection.anchorNode)) {
        const currentRange = selection.getRangeAt(0);
        const postCursorRange = currentRange.cloneRange();
        postCursorRange.selectNodeContents(textInput);
        postCursorRange.setStart(currentRange.endContainer, currentRange.endOffset);
        cursorOffsetFromEnd = postCursorRange.cloneContents().textContent.length;
    }
    let rawInputWithBuffer = normalizeText(textInput.innerText);
    let isBufferPresent = rawInputWithBuffer.startsWith(' ');
    let rawInput = isBufferPresent ? rawInputWithBuffer.substring(1) : rawInputWithBuffer;
    let inputChars = rawInput.split('');
    let htmlOutput = isBufferPresent ? INITIAL_BUFFER_CHAR : '';
    correctChars = 0;
    errors = 0;

    referenceTextDisplay.querySelectorAll('span').forEach(span => {
        span.classList.remove('next-char-ref', 'correct-char-ref', 'incorrect-char-ref');
    });

    for (let i = 0; i < inputChars.length; i++) {
        const inputChar = inputChars[i];
        const refChar = REFERENCE_CHARS[i];
        let charClass = '';
        if (refChar !== undefined) {
            if (inputChar === refChar) {
                correctChars++;
                highlightReferenceChar(i, 'correct-char-ref');
            } else {
                errors++;
                highlightReferenceChar(i, 'incorrect-char-ref');
                charClass = 'error-char-input';
            }
        } else {
            errors++;
            charClass = 'extra-char-input';
        }
        const displayChar = inputChar === ' ' ? '&nbsp;' : inputChar;
        htmlOutput += charClass ? `<span class="${charClass}">${displayChar}</span>` : displayChar;
    }

    let nextIndex = inputChars.length;
    if (nextIndex < REFERENCE_CHARS.length) {
        highlightReferenceChar(nextIndex, 'next-char-ref');
        autoScrollReferenceText(nextIndex);
    }

    let elapsedTimeMinutes = (selectedTime > 0) ? (selectedTime - remainingTime) / 60 : remainingTime / 60;
    wpmCountDisplay.textContent = (elapsedTimeMinutes > 0 ? (correctChars / WPM_WORD_LENGTH) / elapsedTimeMinutes : 0).toFixed(2);
    charCountDisplay.textContent = rawInput.length;
    correctCharCountDisplay.textContent = correctChars;
    errorCountDisplay.textContent = errors;
    textInput.innerHTML = htmlOutput;

    const targetPosition = Math.max(0, (isBufferPresent ? rawInput.length + 1 : rawInput.length) - cursorOffsetFromEnd);
    const newRange = document.createRange();
    const newSelection = window.getSelection();
    newSelection.removeAllRanges();
    let walker = document.createTreeWalker(textInput, NodeFilter.SHOW_TEXT, null, false);
    let currentNode, charIndex = 0, found = false;
    while (currentNode = walker.nextNode()) {
        const textLength = currentNode.nodeValue.length;
        if (charIndex + textLength >= targetPosition) {
            newRange.setStart(currentNode, targetPosition - charIndex);
            found = true;
            break;
        }
        charIndex += textLength;
    }
    if (!found) {
        newRange.selectNodeContents(textInput);
        newRange.collapse(false);
    } else newRange.collapse(true);
    newSelection.addRange(newRange);
    textInput.scrollTop = textInput.scrollHeight;
    if (nextIndex >= REFERENCE_CHARS.length && isTimerRunning) endTest(true);
}

// Приключване на теста
function endTest(completed) {
    clearInterval(timerInterval);
    isTimerRunning = false;
    textInput.contentEditable = 'false';
    testStatusDisplay.textContent = completed ? 'Успешно!' : 'Времето изтече!';
    setDownloadButtonState(true);
}

// Актуализиране на таймера всяка секунда
function updateTimer() {
    if (selectedTime > 0) {
        if (remainingTime <= 0) endTest(false);
        else remainingTime--;
    } else remainingTime++;
    timerInput.value = formatTime(remainingTime);
    if (isTimerRunning) updateStatsAndHighlight();
}

// Стартиране на таймера
function startTimer() {
    if (isTimerRunning || !REFERENCE_TEXT) return;
    isTimerRunning = true;
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
    timerInput.disabled = true;
}

// Нулиране на теста
function resetTest() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    updateTimeFromInput();
    correctChars = 0;
    errors = 0;
    textInput.innerText = '';
    charCountDisplay.textContent = '0';
    wpmCountDisplay.textContent = '0.00';
    timerInput.disabled = false;
    initReferenceText();
}

// Блокиране на copy/paste
function blockCopyPaste(element) {
    ['copy', 'cut', 'paste'].forEach(event => {
        element.addEventListener(event, e => {
            e.preventDefault();
            return false;
        });
    });
}

// EVENT LISTENERS
fileUpload.addEventListener('change', handleFileUpload);
timerInput.addEventListener('change', updateTimeFromInput);
textInput.addEventListener('input', () => {
    if (!REFERENCE_TEXT) return;
    if (!isTimerRunning && normalizeText(textInput.innerText).trim().length > 0) startTimer();
    updateStatsAndHighlight();
});
textInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') e.preventDefault();
    if ((e.key === 'Backspace' || e.key === 'Delete') && normalizeText(textInput.innerText).length <= 1) e.preventDefault();
});
resetButton.addEventListener('click', resetTest);
if (downloadButton) downloadButton.addEventListener('click', exportText);

// ИНИЦИАЛИЗАЦИЯ
updateTimeFromInput();
initReferenceText();
blockCopyPaste(textInput);
blockCopyPaste(referenceTextDisplay);
