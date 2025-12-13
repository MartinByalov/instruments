console.log("~ Clean code, clear mind. - ø");
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
function formatTime(totalSeconds) {
    if (selectedTime === 0 && totalSeconds < 0) {
        return "♾️";
    }
    if (selectedTime === 0) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
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
function setDownloadButtonState(isActive) {
    if (!downloadButton) return;
    downloadButton.style.display = isActive ? 'inline-block' : 'none';
    downloadButton.disabled = !isActive;
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
                console.error('Mammoth Error:', error);
                alert('Грешка при четене на DOCX файла. Уверете се, че файлът е валиден.');
                REFERENCE_TEXT = null;
                resetTest();
            });
    };
    reader.readAsArrayBuffer(file);
}
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
                    pdf.getPage(i).then(page => {
                        return page.getTextContent();
                    }).then(content => {
                        return content.items.map(item => item.str).join(' ');
                    })
                );
            }
            Promise.all(pagePromises).then(texts => {
                setReferenceText(texts.join('\n'));
            }).catch(error => {
                console.error('PDF Text Extraction Error:', error);
                alert('Грешка при извличане на текст от PDF файла.');
                REFERENCE_TEXT = null;
                resetTest();
            });
        });
    };
    reader.readAsArrayBuffer(file);
}
function parseTxt(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        setReferenceText(e.target.result);
    };
    reader.readAsText(file, 'UTF-8');
}
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
    REFERENCE_TEXT = null;
    resetTest();
    switch (fileExtension) {
        case '.txt':
            parseTxt(file);
            break;
        case '.docx':
            parseDocx(file);
            break;
        case '.pdf':
            parsePdf(file);
            break;
        default:
            alert('Неподдържан файлов формат. Моля, използвайте .txt, .docx или .pdf.');
            fileUpload.value = '';
            REFERENCE_TEXT = null;
            resetTest();
            break;
    }
}
function exportText() {
    if (!downloadButton || downloadButton.disabled || !REFERENCE_TEXT) {
        alert("Моля, изчакайте тестът да приключи или заредете текст, за да изтеглите резултат.");
        return;
    }
    const rawTextWithBuffer = normalizeText(textInput.innerText);
    const text = rawTextWithBuffer.startsWith(' ') ? 
                rawTextWithBuffer.substring(1) : 
                rawTextWithBuffer;
    const allCharsCount = charCountDisplay.textContent;
    const correctCount = correctCharCountDisplay.textContent;
    const errorCount = errorCountDisplay.textContent;
    const wpm = wpmCountDisplay.textContent;
    const wordCount = wordCountDisplay.textContent;
    let totalTestTimeText;
    let elapsedTimeSeconds;
    if (selectedTime > 0) {
        elapsedTimeSeconds = selectedTime - remainingTime;
        totalTestTimeText = formatTime(selectedTime);
    } else {
        elapsedTimeSeconds = remainingTime;
        totalTestTimeText = "Без ограничение (започнат в " + new Date(startTime).toLocaleTimeString('bg-BG') + ")";
    }
    const statsHTML = `
        <h2 style="color: #004d40;">Резултати от теста за скорост на писане</h2>
        <p><strong>Дата:</strong> ${new Date().toLocaleString('bg-BG')}</p>
        <p><strong>Зададено време на теста:</strong> ${totalTestTimeText}</p>
        <p><strong>Общ брой думи в текста:</strong> ${wordCount}</p>
        <p><strong>Изминало време:</strong> ${formatTime(Math.max(0, Math.floor(elapsedTimeSeconds)))}</p>
        <p><strong>Общо въведени символи:</strong> ${allCharsCount}</p>
        <p><strong>Коректно въведени символи:</strong> ${correctCount}</p>
        <p><strong>Общо грешки:</strong> <span style="color: red; font-weight: bold;">${errorCount}</span></p>
        <p><strong>Нетна скорост (WPM):</strong> ${wpm}</p>
        <hr style="margin: 20px 0;">
        <h2 style="color: #004d40;">Въведен текст:</h2>
        <div style="font-family: Arial, sans-serif; white-space: pre-wrap;">
            ${text.replace(/\n/g, '<br>')}
        </div>
    `;
    const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset="utf-8">
            <title>WPM Тест Резултат</title>
            <style>
                body { font-family: 'Arial', sans-serif; }
                h2 { margin-top: 15px; }
            </style>
        </head>
        <body>
            ${statsHTML}
        </body>
        </html>
    `;
    const mimeType = 'application/msword';
    const blob = new Blob([htmlContent], { type: mimeType });
    const fileName = `WPM_Test_Result_${new Date().toISOString().slice(0, 10)}.doc`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}
function initReferenceText() {
    if (!REFERENCE_TEXT) {
        referenceTextDisplay.innerHTML = '<p>Качете текстов файл, за да започнете.</p>';
        textInput.contentEditable = 'false';
        testStatusDisplay.textContent = 'Очаква зареждане на текст...';
        testStatusDisplay.className = 'status-running';
        textInput.setAttribute('data-placeholder', 'Качете текстов файл, за да започнете.');
        wordCountDisplay.textContent = '0';
        setDownloadButtonState(false);
        timerInput.disabled = false;
        timerInput.value = formatTime(DEFAULT_TIME_SECONDS);
        timerInput.classList.remove('no-limit');
        updateTimeFromInput();
        return;
    }
    REFERENCE_CHARS = REFERENCE_TEXT.split('');
    referenceTextDisplay.innerHTML = REFERENCE_CHARS.map((char, index) => {
        const content = char === '\n' ? '↵\n' : char;
        return `<span id="ref-char-${index}">${content}</span>`;
    }).join('');
    highlightReferenceChar(0, 'next-char-ref');
    textInput.contentEditable = 'true';
    testStatusDisplay.textContent = 'Очаква старт...';
    testStatusDisplay.className = 'status-running'; 
    textInput.setAttribute('data-placeholder', 'Започнете да пишете тук, за да стартирате таймера...');
    setDownloadButtonState(false);
    timerInput.disabled = false;
    if (selectedTime === 0) {
        timerInput.value = "♾️";
    } else {
        timerInput.value = formatTime(selectedTime);
    }
    textInput.innerHTML = INITIAL_BUFFER_CHAR;
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(textInput);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    textInput.focus();
    if (downloadButton) {
        downloadButton.style.display = 'none'; 
    }
    testStatusDisplay.style.fontWeight = 'normal';
    testStatusDisplay.style.fontSize = '1em';
}
function highlightReferenceChar(index, className, remove = false) {
    const charSpan = document.getElementById(`ref-char-${index}`);
    if (charSpan) {
        charSpan.classList.remove('next-char-ref', 'correct-char-ref', 'incorrect-char-ref');
        if (!remove) {
            charSpan.classList.add(className);
        }
    }
}
function autoScrollReferenceText(nextIndex) {
    const refContainer = referenceTextDisplay.parentElement;
    const nextCharSpan = document.getElementById(`ref-char-${nextIndex}`);
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const cursorRect = range.getClientRects()[0];
    if (!cursorRect || !nextCharSpan) return;
    const inputRect = textInput.getBoundingClientRect();
    const lineHeight = 26;
    const cursorYOffset = cursorRect.top - inputRect.top;
    const scrollTriggerHeight = 3 * lineHeight; 
    if (cursorYOffset > scrollTriggerHeight) {
        const linesPassed = Math.floor(cursorYOffset / lineHeight);
        refContainer.scrollTop = linesPassed * lineHeight;
    } else if (cursorYOffset < lineHeight) {
        refContainer.scrollTop = 0;
    }
}
function updateStatsAndHighlight() {
    if (!REFERENCE_TEXT) return;
    const selection = window.getSelection();
    let cursorOffsetFromEnd = 0;
    if (selection.rangeCount > 0 && textInput.contains(selection.anchorNode)) {
        const currentRange = selection.getRangeAt(0);
        const postCursorRange = currentRange.cloneRange();
        postCursorRange.selectNodeContents(textInput);
        postCursorRange.setStart(currentRange.endContainer, currentRange.endOffset);
        postCursorRange.deleteContents(); 
        cursorOffsetFromEnd = postCursorRange.cloneContents().textContent.length; 
    }
    let rawInputWithBuffer = normalizeText(textInput.innerText);
    let isBufferPresent = rawInputWithBuffer.startsWith(' ');
    let rawInput = isBufferPresent ? rawInputWithBuffer.substring(1) : rawInputWithBuffer;
    let inputChars = rawInput.split('');
    const charCount = rawInput.length;
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
        if (charClass) {
            htmlOutput += `<span class="${charClass}">${displayChar}</span>`;
        } else {
            htmlOutput += displayChar;
        }
    }
    let nextIndex = inputChars.length;
    if (nextIndex < REFERENCE_CHARS.length) {
        highlightReferenceChar(nextIndex, 'next-char-ref');
        autoScrollReferenceText(nextIndex); 
    }
    const totalCorrectWords = correctChars / WPM_WORD_LENGTH;
    let elapsedTimeMinutes = 0;
    if (isTimerRunning) {
        if (selectedTime > 0) {
            elapsedTimeMinutes = (selectedTime - remainingTime) / 60;
        } else {
            elapsedTimeMinutes = remainingTime / 60;
        }
    } else if (remainingTime === 0 && selectedTime > 0) {
        elapsedTimeMinutes = selectedTime / 60;
    } else if (nextIndex >= REFERENCE_CHARS.length && selectedTime === 0) {
        elapsedTimeMinutes = remainingTime / 60;
    }
    let wpm = 0;
    if (elapsedTimeMinutes > 0) {
        wpm = totalCorrectWords / elapsedTimeMinutes;
    }
    wpmCountDisplay.textContent = wpm.toFixed(2);
    charCountDisplay.textContent = charCount;
    correctCharCountDisplay.textContent = correctChars;
    errorCountDisplay.textContent = errors;
    textInput.innerHTML = htmlOutput;
    const targetLength = isBufferPresent ? rawInput.length + 1 : rawInput.length;
    const targetPosition = Math.max(0, targetLength - cursorOffsetFromEnd);
    const newRange = document.createRange();
    const newSelection = window.getSelection();
    newSelection.removeAllRanges();
    let walker = document.createTreeWalker(
        textInput,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
        null,
        false
    );
    let currentNode;
    let charIndex = 0;
    let found = false;
    while (currentNode = walker.nextNode()) {
        if (currentNode.nodeType === Node.TEXT_NODE) {
            const textLength = currentNode.nodeValue.length;
            if (charIndex + textLength >= targetPosition) {
                const offset = targetPosition - charIndex;
                newRange.setStart(currentNode, offset);
                found = true;
                break;
            }
            charIndex += textLength;
        }
    }
    if (!found) {
        newRange.selectNodeContents(textInput);
        newRange.collapse(false); 
    } else if (found) {
        newRange.collapse(true); 
    }
    newSelection.addRange(newRange);
    textInput.scrollTop = textInput.scrollHeight;
    if (nextIndex >= REFERENCE_CHARS.length && isTimerRunning) {
        endTest(true);
    }
}
function endTest(completed) {
    clearInterval(timerInterval);
    isTimerRunning = false;
    textInput.contentEditable = 'false';
    textInput.classList.add('test-finished');
    timerInput.disabled = false;
    let finalElapsedTimeMinutes = 0;
    if (selectedTime > 0) {
        finalElapsedTimeMinutes = (selectedTime - remainingTime) / 60;
    } else {
        finalElapsedTimeMinutes = remainingTime / 60;
    }
    const totalCorrectWords = correctChars / WPM_WORD_LENGTH;
    const finalWPM = finalElapsedTimeMinutes > 0 ? totalCorrectWords / finalElapsedTimeMinutes : 0;
    wpmCountDisplay.textContent = finalWPM.toFixed(2);
    const statusText = completed ?
        'Тестът завърши успешно!' :
        'Времето изтече!';
    testStatusDisplay.textContent = statusText;
    testStatusDisplay.className = 'status-success';
    setDownloadButtonState(true);
    if (downloadButton) {
        downloadButton.style.display = 'inline-block';
    }
}
function updateTimer() {
    if (selectedTime > 0) {
        if (remainingTime <= 0) {
            remainingTime = 0;
            endTest(false);
        } else {
            remainingTime--;
        }
    } else {
        remainingTime++;
    }
    timerInput.value = formatTime(remainingTime);
    if (isTimerRunning) {
        updateStatsAndHighlight();
    }
}
function startTimer() {
    if (isTimerRunning || !REFERENCE_TEXT) return;
    isTimerRunning = true;
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
    textInput.classList.remove('test-finished');
    textInput.contentEditable = 'true';
    testStatusDisplay.textContent = 'Тестът тече...';
    testStatusDisplay.className = 'status-running';
    timerInput.disabled = true;
    setDownloadButtonState(false);
}
function resetTest() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    updateTimeFromInput();
    correctChars = 0;
    errors = 0;
    timerInput.value = formatTime(remainingTime);
    textInput.innerText = '';
    textInput.contentEditable = REFERENCE_TEXT ? 'true' : 'false';
    textInput.classList.remove('test-finished');
    charCountDisplay.textContent = '0';
    correctCharCountDisplay.textContent = '0';
    errorCountDisplay.textContent = '0';
    wpmCountDisplay.textContent = '0.00';
    if (REFERENCE_TEXT) {
        testStatusDisplay.textContent = 'Очаква старт...';
        textInput.setAttribute('data-placeholder', 'Започнете да пишете тук, за да стартирате таймера...');
    } else {
        testStatusDisplay.textContent = 'Очаква зареждане на текст...';
        textInput.setAttribute('data-placeholder', 'Моля, качете текстов файл, за да започнете теста.');
        wordCountDisplay.textContent = '0';
    }
    testStatusDisplay.className = 'status-running';
    timerInput.disabled = false;
    setDownloadButtonState(false);
    if (downloadButton) {
        downloadButton.style.display = 'none';
    }
    testStatusDisplay.style.fontWeight = 'normal';
    testStatusDisplay.style.fontSize = '1em';
    initReferenceText();
    referenceTextDisplay.parentElement.scrollTop = 0;
    textInput.scrollTop = 0;
}
function blockCopyPaste(element) {
    ['copy', 'cut', 'paste'].forEach(event => {
        element.addEventListener(event, (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });
    });
    if (element === referenceTextDisplay) {
        element.parentElement.style.userSelect = 'none';
        element.parentElement.style.webkitUserSelect = 'none';
        element.parentElement.style.MozUserSelect = 'none';
        element.parentElement.style.msUserSelect = 'none';
    }
}
function applyInputStyles() {
    const fixedHeight = '56px'; 
    textInput.style.maxHeight = fixedHeight;
    textInput.style.overflowY = 'auto';
    textInput.style.minHeight = fixedHeight;
}
fileUpload.addEventListener('change', handleFileUpload);
timerInput.addEventListener('change', updateTimeFromInput);
timerInput.addEventListener('blur', updateTimeFromInput);
timerInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        updateTimeFromInput();
        textInput.focus();
    }
});
textInput.addEventListener('input', (event) => {
    if (!REFERENCE_TEXT) return;
    const rawText = normalizeText(textInput.innerText);
    const testInputText = rawText.startsWith(' ') ? rawText.substring(1) : rawText;
    if (!isTimerRunning && testInputText.length > 0) {
        updateTimeFromInput();
        startTimer();
    }
    updateStatsAndHighlight();
});
textInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
        const rawText = normalizeText(textInput.innerText);
        if (rawText.length <= 1 && rawText[0] === ' ') {
            event.preventDefault(); 
            return;
        }
    }
    return; 
});
resetButton.addEventListener('click', resetTest);
if (downloadButton) {
    downloadButton.addEventListener('click', exportText);
}
applyInputStyles(); 
updateTimeFromInput();
textInput.contentEditable = 'false';
initReferenceText();
setDownloadButtonState(false);
blockCopyPaste(textInput);
blockCopyPaste(referenceTextDisplay);