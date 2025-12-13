/* script.js */

const WPM_WORD_LENGTH = 5; 
const DEFAULT_TIME_SECONDS = 600; // 10 минути

let REFERENCE_TEXT = null;
let REFERENCE_CHARS = [];

const textInput = document.getElementById('textInput'); 
const timerInput = document.getElementById('timerInput'); // INPUT елемент
const charCountDisplay = document.getElementById('charCount'); 
const correctCharCountDisplay = document.getElementById('correctCharCount'); 
const errorCountDisplay = document.getElementById('errorCount');
const wpmCountDisplay = document.getElementById('wpmCount');
const testStatusDisplay = document.getElementById('testStatus');
const resetButton = document.getElementById('resetButton'); 
const referenceTextDisplay = document.getElementById('referenceText');
const downloadButton = document.getElementById('downloadButton');

// Нови елементи
const fileUpload = document.getElementById('fileUpload');
const wordCountDisplay = document.getElementById('wordCountDisplay'); 

let isTimerRunning = false;
let startTime = 0;
let timerInterval = null;
let selectedTime = DEFAULT_TIME_SECONDS; 
let remainingTime = selectedTime; 
let correctChars = 0;
let errors = 0;


// *** ФУНКЦИИ ЗА ВРЕМЕ И ВХОД ***

function parseTimeInput(inputString) {
    const cleanedInput = inputString.toLowerCase().trim();
    if (cleanedInput === 'без ограничение' || cleanedInput === '0:00' || cleanedInput === '0') {
        return 0;
    }
    const parts = cleanedInput.split(':');
    let totalSeconds = 0;
    
    if (parts.length === 2) {
        const minutes = parseInt(parts[0]) || 0;
        const seconds = parseInt(parts[1]) || 0;
        totalSeconds = (minutes * 60) + seconds;
    } else if (parts.length === 1 && !isNaN(parseInt(cleanedInput))) {
        // Ако е въведена само една цифра, приемаме я за минути (пр. '5' -> 5 минути)
        const minutes = parseInt(cleanedInput);
        totalSeconds = minutes * 60;
    }
    
    return Math.min(3600, Math.max(0, totalSeconds)); // Максимум 60 минути
}

function formatTime(totalSeconds) {
    if (selectedTime === 0 && totalSeconds < 0) { // За 'Без ограничение' в началото
        return "Без ограничение";
    }
    if (selectedTime === 0) { // При броене нагоре в 'Без ограничение' режим
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    // При режим Отброяване
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateTimeFromInput() {
    selectedTime = parseTimeInput(timerInput.value);
    
    if (selectedTime === 0) {
        remainingTime = 0; 
        timerInput.value = "Без ограничение";
        timerInput.classList.add('no-limit');
    } else {
        remainingTime = selectedTime;
        timerInput.value = formatTime(remainingTime);
        timerInput.classList.remove('no-limit');
    }
}


// *** ФУНКЦИИ ЗА УПРАВЛЕНИЕ НА БУТОНА ЗА ИЗТЕГЛЯНЕ ***

function setDownloadButtonState(isActive) {
    downloadButton.classList.remove('download-btn-active', 'download-btn-inactive');
    if (isActive) {
        downloadButton.classList.add('download-btn-active');
        downloadButton.disabled = false; 
    } else {
        downloadButton.classList.add('download-btn-inactive');
        downloadButton.disabled = true; 
    }
}


// *** ФУНКЦИИ ЗА ОБРАБОТКА НА ФАЙЛОВЕ ***

/**
 * Нормализира текста, премахва невидими символи и замества дългите тирета с обикновени.
 */
function normalizeText(text) {
    let cleanText = text;
    cleanText = cleanText.replace(/\ufeff/g, '').replace(/\u00a0/g, ' '); 
    cleanText = cleanText.replace(/\r/g, ''); 
    cleanText = cleanText.replace(/[„“”’]/g, '"'); 
    cleanText = cleanText.replace(/\n/g, ' '); 
    // НОВА ЛОГИКА: Заместване на дълги тирета (em-dash U+2014 и en-dash U+2013) с обикновено тире (hyphen-minus U+002D)
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
        mammoth.extractRawText({arrayBuffer: e.target.result})
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
    reader.onload = function() {
        const pdfData = new Uint8Array(reader.result);
        
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js';
        
        pdfjsLib.getDocument({data: pdfData}).promise.then(pdf => {
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

// *** ФУНКЦИИ ЗА ЕКСПОРТ (Без промяна) ***

function exportText() {
    if (downloadButton.disabled || !REFERENCE_TEXT) {
        alert("Моля, изчакайте тестът да приключи или заредете текст, за да изтеглите резултат.");
        return;
    }

    const text = textInput.innerText; 
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

// *** ФУНКЦИИ ЗА СТАТИСТИКА И ТАЙМЕР ***

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
    textInput.setAttribute('data-placeholder', 'Започнете да пишете тук, за да стартирате таймера...');
    setDownloadButtonState(false); 
    timerInput.disabled = false; 
    
    if (selectedTime === 0) {
        timerInput.value = "Без ограничение";
    } else {
        timerInput.value = formatTime(selectedTime);
    }
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

/**
 * Имплементира "смарт" скролиране. Скролва контейнера, едва когато следващият символ
 * надхвърли позицията на 4-тия видим ред.
 */
function autoScrollReferenceText(nextIndex) {
    const container = referenceTextDisplay.parentElement; // .reference-container
    const nextCharSpan = document.getElementById(`ref-char-${nextIndex}`);

    if (nextCharSpan && container) {
        const lineHeight = 26; // Приблизителна височина на реда (от style.css line-height: 1.6 * font-size 1.1em ≈ 28px)
        const targetLineOffset = 3; // 4-ти ред (индекс 3)

        // Позиция на елемента спрямо началото на скрола
        const spanTop = nextCharSpan.offsetTop; 
        
        // Позиция, която следващият символ не трябва да надхвърля (4-ти ред)
        const scrollTriggerLine = container.scrollTop + (targetLineOffset * lineHeight); 

        // Скролиране нагоре: ако следващият символ е под 4-тия ред 
        // ИЛИ сме скролнали твърде нагоре (за корекция)
        if (spanTop > scrollTriggerLine || spanTop < container.scrollTop) {
             // Скролва контейнера, така че елементът да се позиционира точно на 4-ти ред отгоре
             container.scrollTop = spanTop - (targetLineOffset * lineHeight);
             
             // Clamp за да не скролва под 0
             if (container.scrollTop < 0) {
                 container.scrollTop = 0;
             }
        }
    }
}


function updateStatsAndHighlight() {
    if (!REFERENCE_TEXT) return;

    const rawInput = normalizeText(textInput.innerText);
    const inputChars = rawInput.split('');
    const charCount = rawInput.length;

    const selection = window.getSelection();

    let htmlOutput = '';
    correctChars = 0;
    errors = 0;

    // Ресетване на всички маркери в референтния текст
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
                highlightReferenceChar(i, 'correct-char-ref'); // Маркира референтния текст като верен
            } else {
                errors++;
                highlightReferenceChar(i, 'incorrect-char-ref'); // Маркира референтния текст като грешен
                charClass = 'error-char-input'; // Клас за грешка във въвеждания текст
            }
        } else {
            // Въведен повече текст от референтния
            errors++;
            charClass = 'extra-char-input'; // Клас за допълнителен символ
        }
        
        const displayChar = inputChar === ' ' ? '&nbsp;' : inputChar;
        
        if (charClass) {
            // Увиване на грешни/допълнителни символи в <span> за стилизиране
            htmlOutput += `<span class="${charClass}">${displayChar}</span>`;
        } else {
            // Верен символ (или символ извън обхвата, който не е грешка)
            htmlOutput += displayChar;
        }
    }

    // Актуализиране на следващия символ в референтния текст
    let nextIndex = inputChars.length;
    if (nextIndex < REFERENCE_CHARS.length) {
        highlightReferenceChar(nextIndex, 'next-char-ref');
        autoScrollReferenceText(nextIndex); // ИЗПОЛЗВАНЕ НА НОВАТА ЛОГИКА ЗА СКРОЛВАНЕ
    }

    // Актуализиране на статистиките
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
    
    // Връщане на новия HTML във въвежданото поле и възстановяване на курсора
    textInput.innerHTML = htmlOutput;
    
    const newRange = document.createRange();
    newRange.selectNodeContents(textInput);
    newRange.collapse(false); 
    selection.removeAllRanges();
    selection.addRange(newRange);
    
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

    testStatusDisplay.textContent = completed ? 
        'Тестът завърши! Натиснете бутона за изтегляне.' : 
        'Времето изтече! Натиснете бутона за изтегляне.';
        
    testStatusDisplay.className = 'status-finished';
    
    setDownloadButtonState(true);
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

    initReferenceText(); 
    textInput.focus(); 
    referenceTextDisplay.parentElement.scrollTop = 0; // Нулиране на скрола на референтния контейнер
}

// *** Обработка на събития ***

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
    if (!isTimerRunning && rawText.length > 0) {
        updateTimeFromInput();
        startTimer();
    }
    updateStatsAndHighlight();
});

textInput.addEventListener('keydown', (event) => {
    // Предотвратява добавянето на нов ред при натискане на Enter
    if (event.key === 'Enter') {
        event.preventDefault(); 
    }
});

resetButton.addEventListener('click', resetTest);
downloadButton.addEventListener('click', exportText); 

// *** Инициализация при зареждане ***

updateTimeFromInput(); 
textInput.contentEditable = 'false';
initReferenceText();

setDownloadButtonState(false);