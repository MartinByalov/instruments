// wpm.js
const WPM_WORD_LENGTH = 5;
const INITIAL_BUFFER_CHAR = '<span class="buffer-char">&nbsp;</span>';
let REFERENCE_TEXT = null;
let REFERENCE_CHARS = [];
const textInput = document.getElementById('textInput');
const minsInput = document.getElementById('minsInput');
const secsInput = document.getElementById('secsInput');
const timerWrapper = document.getElementById('timerWrapper');
const charCountDisplay = document.getElementById('charCount');
const correctCharCountDisplay = document.getElementById('correctCharCount');
const errorCountDisplay = document.getElementById('errorCount');
const wpmCountDisplay = document.getElementById('wpmCount');
const testStatusDisplay = document.getElementById('testStatus');
const resetButton = document.getElementById('resetButton');
const referenceTextDisplay = document.getElementById('referenceText');
const referenceContainer = document.getElementById('referenceContainer');
const downloadButton = document.getElementById('downloadButton');
const fileUpload = document.getElementById('fileUpload');
const wordCountDisplay = document.getElementById('wordCountDisplay');

let isTimerRunning = false;
let timerInterval = null;
let initialTimeInSeconds = 600;
let remainingTime = 600;
let correctChars = 0;
let errors = 0;
let isInfiniteMode = false;

function updateTimeDisplay(totalSeconds) {
    if (isInfiniteMode && !isTimerRunning) return; 
    const m = Math.floor(Math.abs(totalSeconds) / 60);
    const s = Math.abs(totalSeconds) % 60;
    minsInput.value = String(m).padStart(2, '0');
    secsInput.value = String(s).padStart(2, '0');
}

function syncInitialTime() {
    const m = parseInt(minsInput.value) || 0;
    const s = parseInt(secsInput.value) || 0;
    initialTimeInSeconds = (m * 60) + s;
    remainingTime = initialTimeInSeconds;

    if (initialTimeInSeconds === 0) {
        isInfiniteMode = true;
        timerWrapper.classList.add('show-infinity');
    } else {
        isInfiniteMode = false;
        timerWrapper.classList.remove('show-infinity');
    }
}

function normalizeText(text) {
    let cleanText = text;
    cleanText = cleanText.replace(/\ufeff/g, '').replace(/\u00a0/g, ' ');
    cleanText = cleanText.replace(/\r/g, '');
    cleanText = cleanText.replace(/[„“”’]/g, '"');
    cleanText = cleanText.replace(/\n/g, ' ');
    cleanText = cleanText.replace(/[\u2014\u2013]/g, '-');
    return cleanText;
}

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

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const fileName = file.name.toLowerCase();
    const reader = new FileReader();
    if (fileName.endsWith('.txt')) {
        reader.onload = (e) => setReferenceText(e.target.result);
        reader.readAsText(file, 'UTF-8');
    } else if (fileName.endsWith('.docx')) {
        reader.onload = (e) => {
            mammoth.extractRawText({ arrayBuffer: e.target.result })
                .then(result => setReferenceText(result.value));
        };
        reader.readAsArrayBuffer(file);
    } else if (fileName.endsWith('.pdf')) {
        reader.onload = function () {
            const pdfData = new Uint8Array(reader.result);
            pdfjsLib.getDocument({ data: pdfData }).promise.then(pdf => {
                const pagePromises = [];
                for (let i = 1; i <= pdf.numPages; i++) {
                    pagePromises.push(pdf.getPage(i).then(page => page.getTextContent()).then(content => content.items.map(item => item.str).join(' ')));
                }
                Promise.all(pagePromises).then(texts => setReferenceText(texts.join(' ')));
            });
        };
        reader.readAsArrayBuffer(file);
    }
}

function exportText() {
    if (!REFERENCE_TEXT) return;
    const rawTextWithBuffer = normalizeText(textInput.innerText);
    const text = rawTextWithBuffer.startsWith(' ') ? rawTextWithBuffer.substring(1) : rawTextWithBuffer;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><style>body { font-family: 'Arial', sans-serif; } .stat-val { font-weight: bold; color: #00796b; }</style></head><body>`;
    const content = `<h2>Резултати от теста</h2><p>Дата: ${new Date().toLocaleString('bg-BG')}</p><p>WPM: <span class="stat-val">${wpmCountDisplay.textContent}</span></p><p>Точност: <span class="stat-val">${correctCharCountDisplay.textContent}</span> / ${charCountDisplay.textContent}</p><p>Грешки: <span style="color:red">${errorCountDisplay.textContent}</span></p><hr><h3>Въведен текст:</h3><p>${text}</p>`;
    const blob = new Blob(['\ufeff', header + content + "</body></html>"], { type: 'application/msword' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `WPM_Result.doc`;
    a.click();
}

function initReferenceText() {
    if (!REFERENCE_TEXT) {
        referenceTextDisplay.innerHTML = '<p>Качете текстов файл.</p>';
        textInput.contentEditable = 'false';
        testStatusDisplay.textContent = 'Очаква се файл...';
        return;
    }
    REFERENCE_CHARS = REFERENCE_TEXT.split('');
    referenceTextDisplay.innerHTML = REFERENCE_CHARS.map((char, index) => `<span id="ref-char-${index}">${char === '\n' ? '↵\n' : char}</span>`).join('');
    textInput.contentEditable = 'true';
    textInput.innerHTML = INITIAL_BUFFER_CHAR;
    testStatusDisplay.textContent = 'Готовност за писане';
}

function updateStatsAndHighlight() {
    const selection = window.getSelection();
    let offset = 0;
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const pre = range.cloneRange();
        pre.selectNodeContents(textInput);
        pre.setEnd(range.endContainer, range.endOffset);
        offset = pre.toString().length;
    }

    let raw = normalizeText(textInput.innerText);
    let isBuff = raw.startsWith(' ');
    let input = isBuff ? raw.substring(1) : raw;
    let html = isBuff ? INITIAL_BUFFER_CHAR : '';
    correctChars = 0;
    errors = 0;

    const refSpans = referenceTextDisplay.querySelectorAll('span');
    refSpans.forEach(s => s.classList.remove('correct-char-ref', 'incorrect-char-ref', 'next-char-ref'));

    for (let i = 0; i < input.length; i++) {
        if (REFERENCE_CHARS[i] === undefined) {
            errors++;
            html += `<span class="extra-char-input">${input[i]}</span>`;
        } else if (input[i] === REFERENCE_CHARS[i]) {
            correctChars++;
            refSpans[i].classList.add('correct-char-ref');
            html += input[i] === ' ' ? '&nbsp;' : input[i];
        } else {
            errors++;
            refSpans[i].classList.add('incorrect-char-ref');
            html += `<span class="error-char-input">${input[i] === ' ' ? '&nbsp;' : input[i]}</span>`;
        }
    }

    if (input.length < REFERENCE_CHARS.length) {
        const nextCharSpan = refSpans[input.length];
        nextCharSpan.classList.add('next-char-ref');
        const containerRect = referenceContainer.getBoundingClientRect();
        const charRect = nextCharSpan.getBoundingClientRect();
        if (charRect.bottom > containerRect.bottom - 20 || charRect.top < containerRect.top + 20) {
            nextCharSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    let elapsed = (initialTimeInSeconds > 0) ? (initialTimeInSeconds - remainingTime) / 60 : Math.abs(remainingTime) / 60;
    wpmCountDisplay.textContent = (elapsed > 0 ? (correctChars / WPM_WORD_LENGTH) / elapsed : 0).toFixed(2);
    charCountDisplay.textContent = input.length;
    correctCharCountDisplay.textContent = correctChars;
    errorCountDisplay.textContent = errors;

    textInput.innerHTML = html;
    restoreCursor(offset);
    textInput.scrollTop = textInput.scrollHeight;
    
    if (input.length > 0 && input.length >= REFERENCE_CHARS.length) {
        endTest(true);
    } else if (input.trim() === REFERENCE_TEXT.trim() && input.length > 0) {
        endTest(true);
    }
}

function restoreCursor(target) {
    const range = document.createRange();
    const sel = window.getSelection();
    let walker = document.createTreeWalker(textInput, NodeFilter.SHOW_TEXT);
    let cur = 0, node;
    while (node = walker.nextNode()) {
        if (cur + node.length >= target) {
            range.setStart(node, target - cur);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            return;
        }
        cur += node.length;
    }
}

function endTest(completed) {
    clearInterval(timerInterval);
    isTimerRunning = false;
    textInput.contentEditable = 'false';
    
    if (completed) {
        testStatusDisplay.textContent = 'Успешно завършен!';
        testStatusDisplay.className = 'status-success';
        downloadButton.style.display = 'block';
        downloadButton.disabled = false;
        console.log("Test Success - Button shown");
    } else {
        testStatusDisplay.textContent = 'Времето изтече!';
        testStatusDisplay.className = 'status-finished';
        downloadButton.style.display = 'block';
        downloadButton.disabled = false;
        console.log("Test Timeout - Button shown anyway");
    }
}

function updateTimer() {
    if (initialTimeInSeconds > 0) {
        remainingTime--;
        if (remainingTime <= 0) endTest(false);
    } else {
        remainingTime++;
    }
    updateTimeDisplay(remainingTime);
}

function startTimer() {
    if (isTimerRunning || !REFERENCE_TEXT) return;
    isTimerRunning = true;
    syncInitialTime();
    minsInput.disabled = true;
    secsInput.disabled = true;
    if (isInfiniteMode) timerWrapper.classList.remove('show-infinity');
    testStatusDisplay.textContent = 'Писането започна...';
    testStatusDisplay.className = 'status-running';
    timerInterval = setInterval(updateTimer, 1000);
}

function resetTest() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    minsInput.disabled = false;
    secsInput.disabled = false;
    syncInitialTime();
    updateTimeDisplay(remainingTime);
    textInput.innerText = '';
    charCountDisplay.textContent = '0';
    correctCharCountDisplay.textContent = '0';
    errorCountDisplay.textContent = '0';
    wpmCountDisplay.textContent = '0.00';
    testStatusDisplay.textContent = REFERENCE_TEXT ? 'Готовност за писане' : 'Очаква се файл...';
    testStatusDisplay.className = '';
    downloadButton.style.display = 'none';
    downloadButton.disabled = true;
    initReferenceText();
    referenceContainer.scrollTop = 0;
    textInput.focus();
}

fileUpload.addEventListener('change', handleFileUpload);
[minsInput, secsInput].forEach(inp => {
    inp.addEventListener('change', syncInitialTime);
    inp.addEventListener('input', syncInitialTime);
});
textInput.addEventListener('input', () => {
    if (!REFERENCE_TEXT) return;
    if (!isTimerRunning && normalizeText(textInput.innerText).trim().length > 0) startTimer();
    updateStatsAndHighlight();
});
textInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') e.preventDefault();
});
resetButton.addEventListener('click', resetTest);
downloadButton.addEventListener('click', exportText);

syncInitialTime();
initReferenceText();