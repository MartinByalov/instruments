const socket = io();

let padletData = []; 
let isSessionActive = false; // isLocked: Учителят може ли да редактира/добавя въпроси
let isAnsweringEnabled = false; // Учениците могат ли да отговарят
let countdownEndTime = null;

// -------------------- 1. ИНИЦИАЛИЗАЦИЯ --------------------

document.addEventListener('DOMContentLoaded', () => {
    const addCardContainer = document.getElementById('add-card');
    if (addCardContainer) addCardContainer.addEventListener('click', openAddQuestionModal);

    const questionForm = document.getElementById('question-form');
    if (questionForm) questionForm.addEventListener('submit', handleAddQuestion);
    
    const fabMainBtn = document.getElementById('fab-main-btn');
    if (fabMainBtn) fabMainBtn.addEventListener('click', toggleFabMenu);
    
    const showQrBtn = document.getElementById('show-qr-btn');
    if (showQrBtn) showQrBtn.addEventListener('click', toggleQRCodeModal); 
    
    const startTimerButton = document.getElementById('start-timer-button');
    if (startTimerButton) startTimerButton.addEventListener('click', startTimer);
    
    const newPadletBtn = document.getElementById('new-padlet-btn');
    if (newPadletBtn) newPadletBtn.addEventListener('click', startNewPadlet);

    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) downloadBtn.addEventListener('click', downloadBoardAsImage);
    
    // Слушатели за затваряне на модали
    const closeImageModalBtn = document.getElementById('close-image-modal');
    if (closeImageModalBtn) closeImageModalBtn.onclick = closeImageModal;
    
    const closeAddQuestionModalBtn = document.getElementById('close-add-question-modal');
    if (closeAddQuestionModalBtn) closeAddQuestionModalBtn.onclick = closeAddQuestionModal;
    
    const closeQrModalBtn = document.getElementById('qr-close-btn');
    if (closeQrModalBtn) closeQrModalBtn.onclick = closeQRCodeModal;

    // Сървърни слушатели
    socket.on('initialData', initializeSession);
    socket.on('dataUpdated', updateBoard);
    socket.on('sessionStatusUpdate', handleSessionStatusUpdate);
    socket.on('timerUpdate', handleTimerUpdate);
    
    if (fabMainBtn) {
        fabMainBtn.innerHTML = '⚙️'; 
    }
});

// -------------------- 2. SOCKET.IO ОБРАБОТЧИЦИ --------------------

function initializeSession(data) {
    padletData = data.questions || [];
    isSessionActive = data.isLocked || false; 
    isAnsweringEnabled = data.isAnsweringEnabled || false; 
    countdownEndTime = data.countdownEndTime;
    
    updateBoard({ questions: padletData });
    handleSessionStatusUpdate({ isLocked: isSessionActive, isAnsweringEnabled: isAnsweringEnabled });
    handleTimerUpdate({ endTime: countdownEndTime });
    
    generateGeneralQRCode();
    
    // ✅ ДОБАВЕНО: Проверяваме анимацията веднага след инициализация
    checkAndAnimateDownload();
}

function updateBoard(data) {
    padletData = data.questions || [];
    renderPadletBoard();
    // ✅ ПРЕМАХНАТО: Няма нужда да се вика checkAndAnimateDownload() тук
    // Тя ще се вика автоматично от handleTimerUpdate() и handleSessionStatusUpdate()
}

/**
 * @description Проверява дали има отговори и дали сесията е приключила, за да стартира анимацията.
 */
function checkAndAnimateDownload() {
    const hasAnswers = padletData.some(q => q.answers && q.answers.length > 0);
    const downloadButton = document.getElementById('download-btn');
    const fabMainBtn = document.getElementById('fab-main-btn');

    if (downloadButton && fabMainBtn) {
        // ✅ КОРИГИРАНО: Таймерът трябва да е НЕактивен И сесията да е отключена
        const isTimerFinished = countdownEndTime === null; 
        const isSessionInactive = !isSessionActive && !isAnsweringEnabled;
        
        // ✅ КЛЮЧОВО УСЛОВИЕ: Таймерът е неактивен, сесията е отключена И има поне един отговор
        if (hasAnswers && isTimerFinished && isSessionInactive) {
            // Има отговори И няма активен таймер И сесията не е активна
            downloadButton.classList.add('glow-indicator');
            fabMainBtn.classList.add('glow-indicator');
            fabMainBtn.innerHTML = '⬇️'; 
            console.log('✅ Анимация активирана: Таймерът е спрян, сесията не е активна и има отговори');
        } else {
            // Няма отговори ИЛИ таймерът тече ИЛИ сесията е активна
            downloadButton.classList.remove('glow-indicator');
            fabMainBtn.classList.remove('glow-indicator');
            fabMainBtn.innerHTML = '⚙️'; 
        }
    }
}

function handleSessionStatusUpdate(data) {
    isSessionActive = data.isLocked; 
    isAnsweringEnabled = data.isAnsweringEnabled || false; 
    
    const addCard = document.getElementById('add-card');
    
    // --- Логика за видимост на Add Card ---
    if (countdownEndTime || isSessionActive) {
        if (addCard) addCard.style.display = 'none';
    } else {
        if (addCard) addCard.style.display = 'flex';
    }

    if (addCard) {
        if (countdownEndTime) {
            addCard.title = 'Не може да добавяте въпроси, докато таймерът работи.';
            addCard.style.opacity = 0.5;
        } else if (isSessionActive) {
            addCard.title = 'Първо спрете сесията/затворете QR менюто.';
            addCard.style.opacity = 0.5;
        } else {
            addCard.title = 'Добавяне на нов въпрос';
            addCard.style.opacity = 1;
        }
    }
    
    // Индикация на QR Бутона
    const showQrBtn = document.getElementById('show-qr-btn');
    if (showQrBtn) {
        if (countdownEndTime) {
            showQrBtn.innerHTML = '🔳';
            showQrBtn.title = "Сесията е АКТИВНА за отговори (Таймерът тече)";
            showQrBtn.style.backgroundColor = '#28a745';
        } else if (isSessionActive) {
            showQrBtn.innerHTML = '⚙️'; 
            showQrBtn.title = "Настройки на Padlet-а (Модалът е отворен)";
            showQrBtn.style.backgroundColor = '#007bff';
        } else {
            showQrBtn.innerHTML = '🔳'; 
            showQrBtn.title = "Старт на сесията / QR код";
            showQrBtn.style.backgroundColor = '#f0f0f0'; 
            showQrBtn.style.color = '#333';
        }
        if (showQrBtn.style.backgroundColor !== 'rgb(240, 240, 240)') {
             showQrBtn.style.color = 'white';
        } else {
             showQrBtn.style.color = '#333';
        }
    }
    
    // ✅ Извикваме анимацията след всяка промяна в статуса
    checkAndAnimateDownload();
    renderPadletBoard();
}

function handleTimerUpdate(data) {
    countdownEndTime = data.endTime;
    const timerDisplay = document.getElementById('countdown-display'); 
    
    if (!timerDisplay) return;

    if (window.timerInterval) {
        clearInterval(window.timerInterval);
    }
    
    if (countdownEndTime) {
        const startTimerButton = document.getElementById('start-timer-button');
        if (startTimerButton) {
            startTimerButton.textContent = "Рестартирай Таймера";
            startTimerButton.style.backgroundColor = '#ffc107'; 
        }

        window.timerInterval = setInterval(() => {
            const remainingTime = countdownEndTime - Date.now();
            if (remainingTime <= 0) {
                clearInterval(window.timerInterval);
                
                // ✅ КОРИГИРАНО: Изпращаме сигнал за спиране на таймера
                socket.emit('startTimer', { endTime: null });
                
                // ✅ НЕ нулираме локално тук - ще получим актуализация от сървъра
                timerDisplay.textContent = "Времето изтече! 🚨"; 
                
                console.log('⏰ Таймерът приключи локално, чакаме потвърждение от сървъра...');
                return;
            }
            
            const totalSeconds = Math.floor(remainingTime / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            
            const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            timerDisplay.textContent = `Остава: ${timeFormatted}`;
            
        }, 1000);
    } else {
        // ✅ Таймерът е спрян
        timerDisplay.textContent = "Няма активен таймер.";
        
        const startTimerButton = document.getElementById('start-timer-button');
        if (startTimerButton) {
            startTimerButton.textContent = "Старт";
            startTimerButton.style.backgroundColor = '#28a745'; 
        }
    }
    
    // ✅ Извикваме анимацията след всяка актуализация на таймера
    checkAndAnimateDownload();
}

// -------------------- 3. УПРАВЛЕНИЕ НА СЕСИЯТА И QR КОДА --------------------

function generateGeneralQRCode() {
    const qrDiv = document.getElementById('general-qr-code');
    if (!qrDiv) return;
    qrDiv.innerHTML = '';

    const studentUrl = `${window.location.origin}/student`; 

    if (typeof QRCode !== 'undefined') {
        new QRCode(qrDiv, {
            text: studentUrl,
            width: 300,
            height: 300,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
        
    }
}

function toggleQRCodeModal() {
    const qrModalContainer = document.getElementById('qr-modal-overlay');
    if (!qrModalContainer) return;
    
    const isShowing = !qrModalContainer.classList.contains('hidden');

    if (!isShowing) {
        // --- ОТВАРЯНЕ (РЕЖИМ ВИДИМОСТ/ПОДГОТОВКА) ---
        qrModalContainer.classList.remove('hidden'); 
        qrModalContainer.style.display = 'flex';      
        generateGeneralQRCode();
        
        // ✅ Съобщаваме на сървъра, че сесията е заключена (за подготовка)
        socket.emit('sessionControl', { 
            isLocked: true, 
            isAnsweringEnabled: false 
        }); 
        
    } else {
        // --- ЗАТВАРЯНЕ ---
        qrModalContainer.classList.add('hidden'); 
        qrModalContainer.style.display = 'none'; 
        
        // ✅ КОРИГИРАНО: Ако таймерът не тече, отключваме сесията
        if (!countdownEndTime) {
            socket.emit('sessionControl', { 
                isLocked: false, 
                isAnsweringEnabled: false 
            }); 
        }
    }
}

function closeQRCodeModal() {
    toggleQRCodeModal(); 
}

function startTimer() {
    const timerMinutesInput = document.getElementById('timer-minutes');
    const timerSecondsInput = document.getElementById('timer-seconds'); 
    
    const durationMinutes = parseInt(timerMinutesInput.value, 10) || 0;
    const durationSeconds = parseInt(timerSecondsInput.value, 10) || 0; 
    
    if (durationMinutes === 0 && durationSeconds === 0) {
        alert("Въведете валидна продължителност (поне 1 секунда).");
        return;
    }
    
    const durationMs = (durationMinutes * 60 * 1000) + (durationSeconds * 1000);
    const endTime = Date.now() + durationMs;
    
    // ✅ Изключваме анимацията преди старт
    const downloadButton = document.getElementById('download-btn');
    const fabMainBtn = document.getElementById('fab-main-btn');
    if (downloadButton) downloadButton.classList.remove('glow-indicator');
    if (fabMainBtn) {
        fabMainBtn.classList.remove('glow-indicator');
        fabMainBtn.innerHTML = '⚙️'; 
    }

    // 1. Стартираме таймера на сървъра (Той ще изпрати `timerUpdate` към всички)
    socket.emit('startTimer', { endTime: endTime });
    
    // 2. Изпращаме и статуса за отговори
    socket.emit('sessionControl', { 
        isLocked: true, 
        isAnsweringEnabled: true 
    });
    
    // 3. Затваряме модала след старт
    closeQRCodeModal();
}

// -------------------- 4. УПРАВЛЕНИЕ НА МОДАЛИ И СЪДЪРЖАНИЕ --------------------

function openAddQuestionModal() {
    if (isSessionActive || countdownEndTime) {
        alert("Не може да добавяте въпроси, докато сесията е активна или таймерът тече. Моля, спрете сесията/таймера първо.");
        return; 
    }
    document.getElementById('question-form').reset();
    document.getElementById('add-question-modal').classList.remove('hidden');
}

function closeAddQuestionModal() {
    document.getElementById('add-question-modal').classList.add('hidden');
}

function handleAddQuestion(event) {
    event.preventDefault();

    const text = document.getElementById('question-text-input').value.trim();
    const url = document.getElementById('question-webpage-url-input').value.trim();
    const imageUrl = document.getElementById('question-image-url-input').value.trim();
    
    if (!text) return;

    const newQuestion = {
        id: 'q' + Date.now() + Math.floor(Math.random() * 1000), 
        text: text,
        webpageUrl: url,
        imageUrl: imageUrl, 
        answers: []
    };

    padletData.push(newQuestion);
    closeAddQuestionModal();
    
    socket.emit('updateData', { questions: padletData });
}

function removeQuestion(questionId) {
    if (countdownEndTime) {
        alert("Не може да премахвате въпроси, докато таймерът работи. Моля, спрете таймера първо.");
        return;
    }
    
    if (confirm("Сигурни ли сте, че искате да премахнете този въпрос и всички свързани с него отговори?")) {
        padletData = padletData.filter(q => q.id !== questionId);
        socket.emit('updateData', { questions: padletData });
        
        checkAndAnimateDownload();
    }
}

function renderPadletBoard() {
    const answersBoard = document.getElementById('answers-board');
    if (!answersBoard) return;

    const addCard = document.getElementById('add-card');
    const currentQuestions = answersBoard.querySelectorAll('.question-column:not(.add-new-card)');
    currentQuestions.forEach(q => q.remove());

    padletData.forEach((q, index) => {
        const column = createQuestionColumn(q, index + 1);
        answersBoard.insertBefore(column, addCard);
    });
}

function createQuestionColumn(question, index) {
    const column = document.createElement('div');
    column.className = 'question-column';
    
    const header = document.createElement('div');
    header.className = 'question-card question-header';
    
    const removeBtnDisplay = countdownEndTime ? 'display: none;' : 'display: block;';
    
    header.innerHTML = `
        <div class="question-controls">
            <span class="question-number">${index}</span>
        </div>
        <button class="remove-question-btn" onclick="removeQuestion('${question.id}')" title="Премахни въпроса" style="${removeBtnDisplay}">&times;</button>
        <p class="question-text">${question.text}</p>
        ${question.webpageUrl ? `<div class="webpage-link-container"><a href="${question.webpageUrl}" target="_blank">🔗 Отвори линк</a></div>` : ''}
        ${question.imageUrl ? `<img src="${question.imageUrl}" class="question-image" alt="Изображение към въпроса" onclick="showImageModal('${question.imageUrl}')">` : ''}
        
        <button class="answer-btn" disabled>${question.answers.length} Отговора</button>
    `;
    column.appendChild(header);
    
    const answerListDiv = document.createElement('div');
    answerListDiv.className = 'answer-list';
    
    const sortedAnswers = question.answers.sort((a, b) => a.studentName.localeCompare(b.studentName));
    
    sortedAnswers.forEach(answer => {
        const answerItem = document.createElement('li');
        answerItem.className = 'answer-item';
        answerItem.innerHTML = `
            <div class="answer-content">
                <strong>${answer.studentName}:</strong>
                ${answer.answerText}
            </div>
        `;
        answerListDiv.appendChild(answerItem);
    });

    column.appendChild(answerListDiv);
    return column;
}


function startNewPadlet() {
    if (confirm("Сигурни ли сте, че искате да стартирате нов Padlet? Това ще изчисти всички текущи въпроси и отговори.")) {
        padletData = [];
        socket.emit('startNewPadlet', {}); 
        
        renderPadletBoard();
        
        closeAddQuestionModal();
        closeQRCodeModal();
        
        const downloadButton = document.getElementById('download-btn');
        const fabMainBtn = document.getElementById('fab-main-btn');
        if (downloadButton) downloadButton.classList.remove('glow-indicator');
        if (fabMainBtn) {
            fabMainBtn.classList.remove('glow-indicator');
            fabMainBtn.innerHTML = '⚙️'; 
        }
    }
}

function toggleFabMenu() {
    const menuWrapper = document.querySelector('.fab-menu-container'); 
    if (menuWrapper) {
        menuWrapper.classList.toggle('show');
    }
}

function downloadBoardAsImage() {
    // ✅ СЛЕД ИЗТЕГЛЯНЕ ИЗКЛЮЧВАМЕ АНИМАЦИЯТА
    const downloadButton = document.getElementById('download-btn');
    const fabMainBtn = document.getElementById('fab-main-btn');
    if (downloadButton) downloadButton.classList.remove('glow-indicator');
    if (fabMainBtn) {
        fabMainBtn.classList.remove('glow-indicator');
        fabMainBtn.innerHTML = '⚙️'; 
    }
    
    const board = document.getElementById('answers-board');
    if (!board) return;

    const fabMenu = document.querySelector('.fab-menu-container');
    const addCard = document.getElementById('add-card');
    
    const fabMenuDisplayOriginal = fabMenu ? fabMenu.style.display : null;
    
    if (fabMenu) fabMenu.style.display = 'none';
    if (addCard) addCard.style.display = 'none';
    
    document.querySelectorAll('.remove-question-btn').forEach(btn => btn.style.display = 'none');

    if (typeof html2canvas !== 'undefined') {
        html2canvas(board, {
            scale: 2, 
            useCORS: true 
        }).then(canvas => {
            // ------------------ ВЪЗСТАНОВЯВАНЕ -------------------
            if (fabMenu) fabMenu.style.display = fabMenuDisplayOriginal;
            if (addCard) {
                if (!countdownEndTime) {
                    addCard.style.display = 'flex';
                }
            } 
            document.querySelectorAll('.remove-question-btn').forEach(btn => btn.style.display = 'block');

            // ------------------ ИЗТЕГЛЯНЕ -------------------
            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = image;
            link.download = 'Padlet_Results_' + new Date().toISOString().slice(0, 10) + '.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // ✅ ВЪЗСТАНОВЯВАНЕ НА АНИМАЦИЯТА СЛЕД ИЗТЕГЛЯНЕ
            setTimeout(() => {
                checkAndAnimateDownload();
            }, 100);
            
        });
    } else {
        alert("Библиотеката html2canvas не е заредена за изтегляне.");
        
        // В случай на грешка, възстановяваме състоянието
        if (fabMenu) fabMenu.style.display = fabMenuDisplayOriginal;
        if (addCard) {
            if (!countdownEndTime) {
                addCard.style.display = 'flex';
            }
        }
        document.querySelectorAll('.remove-question-btn').forEach(btn => btn.style.display = 'block');
        
        // ✅ ВЪЗСТАНОВЯВАНЕ НА АНИМАЦИЯТА
        setTimeout(() => {
            checkAndAnimateDownload();
        }, 100);
    }
}

function showImageModal(url) {
    const imageModal = document.getElementById('image-modal');
    const modalImageDisplay = document.getElementById('modal-image-display');
    
    if (imageModal && modalImageDisplay) {
        modalImageDisplay.src = url;
        imageModal.classList.remove('hidden');
    }
}

function closeImageModal() {
    document.getElementById('image-modal').classList.add('hidden');
}