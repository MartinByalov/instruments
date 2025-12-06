// scripts/padlet-student.js

const socket = io();

// --- Global State ---
let studentName = localStorage.getItem('padletStudentName') || '';
let currentQuestions = [];
let isAnsweringEnabled = false;
let countdownEndTime = null;
let timerInterval = null;

// --- DOM Elements ---
const loadingOverlay = document.getElementById('loading-overlay');
const studentAppContainer = document.getElementById('student-app-container');
const timerStatusDisplay = document.getElementById('timer-status');
const lockStatusDisplay = document.getElementById('lock-status');
const answersBoardStudent = document.getElementById('answers-board-student');
const modalAnswer = document.getElementById('answer-modal');

// Елементи на Модала за отговор
const modalForm = document.getElementById('modal-form');
const modalQuestionText = document.getElementById('modal-question-text');
const modalQuestionId = document.getElementById('modal-question-id');
const modalStudentNameInput = document.getElementById('modal-student-name');
const modalAnswerText = document.getElementById('modal-answer-text');

const modalImage = document.getElementById('image-modal');
const modalImageDisplay = document.getElementById('modal-image-display');


// -------------------- 1. ИНИЦИАЛИЗАЦИЯ И ОБРАБОТЧИЦИ --------------------

document.addEventListener('DOMContentLoaded', () => {
    
    // Ако името съществува в localStorage, попълваме го в полето
    if (modalStudentNameInput && studentName) {
        modalStudentNameInput.value = studentName;
        // КЛЮЧОВО: Заключваме полето за име, ако вече е запазено
        checkStudentNameAndLockInput(true);
    } else {
        checkStudentNameAndLockInput(false);
    }

    // Слушатели за Submit
    if (modalForm) {
        modalForm.addEventListener('submit', handleAnswerSubmit);
    }
    
    // Сървърни слушатели
    socket.on('initialData', initializeSession);
    socket.on('dataUpdated', updateBoard);
    socket.on('sessionStatusUpdate', handleSessionStatusUpdate);
    socket.on('timerUpdate', handleTimerUpdate);

    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
    
    // Глобална функция за затваряне на модали, използвана в HTML
    window.closeModal = (id) => {
        const modal = document.getElementById(id);
        if (modal) modal.classList.add('hidden');
    };
});

/**
 * @description Проверява дали има запазено име и заключва полето
 */
function checkStudentNameAndLockInput(isSaved) {
     if (modalStudentNameInput) {
        modalStudentNameInput.readOnly = isSaved;
        modalStudentNameInput.placeholder = isSaved ? 'Името е запазено' : 'Име и Фамилия';
        if (!isSaved) {
            modalStudentNameInput.focus();
        }
    }
}


// -------------------- 2. SOCKET.IO ОБРАБОТЧИЦИ (Непроменени) --------------------

function initializeSession(data) {
    currentQuestions = data.questions || [];
    isAnsweringEnabled = data.isAnsweringEnabled || false;
    
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
    if (studentAppContainer) studentAppContainer.classList.remove('hidden');
    
    updateBoard({ questions: currentQuestions });
    handleSessionStatusUpdate(data);
    handleTimerUpdate({ endTime: data.countdownEndTime });
}

function updateBoard(data) {
    currentQuestions = data.questions || [];
    renderQuestions();
}

function handleSessionStatusUpdate(data) {
    isAnsweringEnabled = data.isAnsweringEnabled || false; 
    
    if (lockStatusDisplay) {
        if (isAnsweringEnabled) {
            lockStatusDisplay.textContent = "СЕСИЯ: АКТИВНА за отговори!";
            lockStatusDisplay.className = 'status-message status-active';
        } else {
            lockStatusDisplay.textContent = "СЕСИЯ: НЕАКТИВНА. Изчакайте учителя.";
            lockStatusDisplay.className = 'status-message status-locked';
        }
    }
    
    renderQuestions();
}

function handleTimerUpdate(data) {
    countdownEndTime = data.endTime;
    updateTimerUI(countdownEndTime);
}

// -------------------- 3. УПРАВЛЕНИЕ НА СЪДЪРЖАНИЕТО И UI (Непроменени) --------------------

function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
}

function updateTimerUI(endTime) {
    if (timerInterval) clearInterval(timerInterval);

    if (endTime) {
        timerInterval = setInterval(() => {
            const remaining = endTime - Date.now();
            const timeStr = formatTime(remaining);

            if (remaining <= 0) {
                clearInterval(timerInterval);
                if (timerStatusDisplay) timerStatusDisplay.textContent = '00:00';
                return;
            }

            if (timerStatusDisplay) timerStatusDisplay.textContent = timeStr;
        }, 1000);
        
        if (timerStatusDisplay) timerStatusDisplay.textContent = formatTime(endTime - Date.now());

    } else {
        if (timerStatusDisplay) timerStatusDisplay.textContent = '00:00';
    }
}

function renderQuestions() {
    if (!answersBoardStudent) return;
    answersBoardStudent.innerHTML = '';
    
    if (currentQuestions.length === 0) {
        answersBoardStudent.innerHTML = '<p>Изчакайте учителя да добави въпроси.</p>';
        return;
    }

    currentQuestions.forEach((q, index) => {
        const questionHtml = createQuestionCard(q, index + 1);
        answersBoardStudent.appendChild(questionHtml);
    });
}

function createQuestionCard(question, index) {
    const card = document.createElement('div');
    card.className = 'question-card-student';
    
    let mediaHtml = '';
    
    if (question.webpageUrl) {
        mediaHtml += `<div class="webpage-link-container"><a href="${question.webpageUrl}" target="_blank">🔗 Отвори линк</a></div>`;
    }
    
    if (question.imageUrl) {
        const img = document.createElement('img');
        img.src = question.imageUrl;
        img.className = 'question-image-student';
        img.alt = 'Изображение към въпроса';
        img.onclick = () => showImageModal(question.imageUrl);
        mediaHtml += img.outerHTML;
    }
    
    card.innerHTML = `
        <div class="question-header">
            <span class="question-number">${index}</span>
            <p class="question-text">${question.text}</p>
        </div>
        ${mediaHtml}
    `;
    
    const answerButton = document.createElement('button');
    answerButton.className = 'answer-submit-btn';
    answerButton.textContent = 'Отговори';
    answerButton.disabled = !isAnsweringEnabled; 
    
    if (!isAnsweringEnabled) {
        answerButton.title = "Изчакайте учителя да стартира сесията.";
    }

    answerButton.onclick = () => openAnswerModal(question);
    
    card.appendChild(answerButton); 
    
    return card;
}

// -------------------- 4. УПРАВЛЕНИЕ НА МОДАЛА ЗА ОТГОВОР (КЛЮЧОВИ ПРОМЕНИ ТУК) --------------------

function openAnswerModal(question) {
    if (!isAnsweringEnabled) {
        alert("В момента сесията за отговори е заключена. Моля, изчакайте учителя да я активира.");
        return;
    }
    
    // 1. Проверка на името преди отваряне
    const currentName = modalStudentNameInput ? modalStudentNameInput.value.trim() : '';
    if (!currentName) {
        alert("Моля, въведете Вашето име/псевдоним, за да отговорите.");
        if (modalAnswer) modalAnswer.classList.remove('hidden'); // Показваме модала, за да може да въведе име
        if (modalStudentNameInput) modalStudentNameInput.focus();
        return;
    }
    
    // 2. Запазване на името и заключване на полето, ако е променено
    if (currentName !== studentName) {
        studentName = currentName;
        localStorage.setItem('padletStudentName', studentName);
        checkStudentNameAndLockInput(true); // Заключваме го!
    }

    // 3. Попълване на модала
    if (modalQuestionText) modalQuestionText.textContent = `Въпрос: ${question.text}`;
    if (modalQuestionId) modalQuestionId.value = question.id;
    if (modalAnswerText) modalAnswerText.value = ''; // Изчистване по подразбиране
    
    // 4. Проверка за съществуващ отговор (презаписване)
    const existingAnswer = question.answers?.find(a => a.studentName === studentName);
    if (existingAnswer && modalAnswerText) {
        modalAnswerText.value = existingAnswer.answerText;
    }
    
    if (modalAnswer) modalAnswer.classList.remove('hidden');
    if (modalAnswerText) modalAnswerText.focus(); // Фокус върху полето за отговор
}

function handleAnswerSubmit(event) {
    event.preventDefault();
    
    if (!modalQuestionId || !modalAnswerText || !modalStudentNameInput) return;
    
    const questionId = modalQuestionId.value;
    const answerText = modalAnswerText.value.trim();
    const currentName = modalStudentNameInput.value.trim();
    
    if (!currentName) {
        alert("Моля, въведете Вашето име/псевдоним.");
        modalStudentNameInput.focus();
        return;
    }
    
    if (!answerText) {
        alert("Моля, въведете отговор.");
        modalAnswerText.focus();
        return;
    }
    
    // Актуализация на глобалното име, ако е въведено сега (ако не е било)
    if (currentName !== studentName) {
        studentName = currentName;
        localStorage.setItem('padletStudentName', studentName);
        checkStudentNameAndLockInput(true);
    }
    
    const answer = {
        studentName: studentName, // Използваме вече валидираното име
        answerText: answerText
    };
    
    // Изпращаме отговор на сървъра
    socket.emit('submitAnswer', { questionId: questionId, answer: answer });
    
    closeModal('answer-modal');
    // Можем да дадем и по-дискретно съобщение, но alert работи навсякъде
    // const submitMessage = document.getElementById('submit-message');
    // if (submitMessage) {
    //     submitMessage.textContent = `Отговорът Ви беше изпратен успешно!`;
    //     setTimeout(() => submitMessage.textContent = '', 3000);
    // }
    alert(`Отговорът Ви беше изпратен!`);
}

window.showImageModal = (url) => {
    if (modalImage && modalImageDisplay) {
        modalImageDisplay.src = url;
        modalImage.classList.remove('hidden');
    }
};