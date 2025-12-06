// =================================================
// ГЛОБАЛНИ КОНСТАНТИ И ЕЛЕМЕНТИ (ДЕКЛАРАЦИЯ)
// =================================================

let appContainer;
let controlPanel;
let lessonTopicInput;
let mainTimerDisplay;
let startBtn;
let resetBtnCorner;
let timelineContainer;
let addActivityBtn;
let timelineProgress;
let endLabel;
let victoryTrophyDisplay; // 🏆 Голямата анимирана купа (victory-screen)

// Модал елементи
let activityModal;
let modalTitle;
let activityTemplateSelect; // НОВ ЕЛЕМЕНТ
let activityTitleInput;
let activityDurationInput;
let activityLinkInput;
let activityImageInput;
let modalSaveBtn;
let modalCancelBtn;

// Lightbox елементи
let lightbox;
let lightboxImg;
let lightboxCloseBtn;

// Глобално състояние
let scheduleData = [
    { title: 'Въведение', duration: 5, linkUrl: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/JavaScript-logo.png', status: 'pending', side: 'left' },
    { title: 'Демо на функционалност', duration: 10, linkUrl: '', imageUrl: '', status: 'pending', side: 'right' },
];
let totalDurationSeconds = 0;
let mainTimerInterval;
let elapsedTimeSeconds = 0;
let isRunning = false;
let currentActivityIndex = -1;
let editActivityIndex = null;
let draggedItem = null;
let dragOverTargetIndex = null; // Индекс на мястото, където ще бъде пуснат елементът

/**
 * Дефиниции на шаблони за дейности.
 * Използва се за автоматично попълване на заглавието и изображението.
 */
const ACTIVITY_TEMPLATES = {
    'exercise': {
        title: 'Упражнение/Демонстрация',
        duration: 10, // Минути по подразбиране
        imageUrl: 'https://i.imgur.com/x3rJ22f.png', // Примерна икона за упражнение/демо
    },
    'practical_task': {
        title: 'Практическа задача/Кодиране',
        duration: 20,
        imageUrl: 'https://i.imgur.com/V7R6P1r.png', // Примерна икона за кодиране/задача
    },
    'group_task': {
        title: 'Групова задача/Дискусия',
        duration: 15,
        imageUrl: 'https://i.imgur.com/8Qz9h6o.png', // Примерна икона за група/дискусия
    },
    'break': {
        title: 'Почивка',
        duration: 5,
        imageUrl: 'https://i.imgur.com/J7t0M4w.png', // Примерна икона за почивка
    },
    'custom': {
        title: '',
        duration: 15,
        imageUrl: '',
    }
};


// =================================================
// ФУНКЦИИ ЗА РАБОТА С ВРЕМЕТО
// =================================================

function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function calculateTotalDuration() {
    totalDurationSeconds = Math.round(scheduleData.reduce((total, activity) => total + (activity.duration * 60), 0));
    updateMainTimerDisplay();
}

function updateMainTimerDisplay() {
    const remaining = totalDurationSeconds - elapsedTimeSeconds;
    mainTimerDisplay.textContent = formatTime(remaining < 0 ? 0 : remaining);
}

function updateProgressDisplay() {
    const timelineProgressEl = document.getElementById('timeline-progress');
    const timelineContainerEl = document.getElementById('timeline-container-centered');

    if (!timelineContainerEl || !timelineProgressEl) return;

    const totalTime = totalDurationSeconds;

    if (totalTime === 0) {
        timelineProgressEl.style.height = '0px';
        return;
    }

    let progressHeight = 0;
    let accumulatedTime = 0;
    const cardWrappers = timelineContainerEl.querySelectorAll('.timeline-item-wrapper');

    for (let i = 0; i < scheduleData.length; i++) {
        const activity = scheduleData[i];
        const activityDurationSec = activity.duration * 60;
        const cardElementWrapper = cardWrappers[i];

        if (!cardElementWrapper) continue;
        const cardHeight = cardElementWrapper.offsetHeight;

        if (i < currentActivityIndex) {
            progressHeight += cardHeight;
            accumulatedTime += activityDurationSec;
        } else if (i === currentActivityIndex) {
            const timeInCurrentActivity = elapsedTimeSeconds - accumulatedTime;
            let progressRatio = 0;
            if (activityDurationSec > 0) {
                progressRatio = Math.min(timeInCurrentActivity / activityDurationSec, 1);
            }
            progressHeight += cardHeight * progressRatio;
            break;
        } else {
            break;
        }
    }

    if (currentActivityIndex >= scheduleData.length) {
        const totalLineHeight = timelineContainerEl.offsetHeight - 40;
        progressHeight = totalLineHeight;
    }

    timelineProgressEl.style.height = `${progressHeight}px`;
}

function startTimer() {
    if (isRunning) return;

    if (scheduleData.length === 0) {
        alert('Моля, добавете поне една активност преди да стартирате.');
        return;
    }

    isRunning = true;
    startBtn.textContent = 'ПАУЗА';
    startBtn.style.backgroundColor = '#f59e0b';
    startBtn.style.transform = 'translateY(-50%)';
    resetBtnCorner.style.display = 'block';

    if (addActivityBtn) {
        addActivityBtn.classList.add('is-hidden');
    }

    if (victoryTrophyDisplay) {
        victoryTrophyDisplay.classList.remove('is-active');
    }

    if (currentActivityIndex < 0) {
        currentActivityIndex = scheduleData.findIndex(a => a.status === 'pending');
        if (currentActivityIndex >= 0) {
            scheduleData[currentActivityIndex].status = 'current';
        }
    }
    renderSchedule();

    mainTimerInterval = setInterval(() => {
        elapsedTimeSeconds++;
        updateMainTimerDisplay();
        updateProgressDisplay();
        checkActivityCompletion();

        if (elapsedTimeSeconds >= totalDurationSeconds) {
            clearInterval(mainTimerInterval);
            finishLesson();
        }
    }, 1000);
}

function pauseTimer() {
    if (!isRunning) return;

    isRunning = false;
    clearInterval(mainTimerInterval);
    startBtn.textContent = 'ПРОДЪЛЖИ';
    startBtn.style.backgroundColor = '#10b981';
    startBtn.style.transform = 'translateY(-50%)';

    if (addActivityBtn) {
        addActivityBtn.classList.remove('is-hidden');
    }

    renderSchedule();
}

function resetSchedule() {
    const isFinished = elapsedTimeSeconds >= totalDurationSeconds && totalDurationSeconds > 0;

    if (isRunning) {
        if (!confirm('Таймерът работи. Сигурни ли сте, че искате да нулирате целия урок?')) {
            return;
        }
    } else if (scheduleData.length > 0 || elapsedTimeSeconds > 0 || isFinished) {
        if (!isFinished && !confirm('Сигурни ли сте, че искате да нулирате целия график и време?')) {
            return;
        }
    } else {
        return;
    }

    pauseTimer();
    elapsedTimeSeconds = 0;
    currentActivityIndex = -1;
    isRunning = false;

    scheduleData.forEach(a => a.status = 'pending');
    calculateTotalDuration();

    startBtn.textContent = 'СТАРТ';
    startBtn.style.backgroundColor = '#10b981';
    resetBtnCorner.style.display = 'none';
    startBtn.style.transform = 'translateY(-50%)';

    if (victoryTrophyDisplay) {
        victoryTrophyDisplay.classList.remove('is-active');
    }
    if (addActivityBtn) {
        addActivityBtn.classList.remove('is-hidden');
    }

    renderSchedule();
    updateProgressDisplay();
}

function checkActivityCompletion() {
    if (currentActivityIndex < 0 || currentActivityIndex >= scheduleData.length) return;

    const activity = scheduleData[currentActivityIndex];
    const activityDurationSec = activity.duration * 60;
    let activitiesBeforeCurrentTime = 0;

    for (let i = 0; i < currentActivityIndex; i++) {
        activitiesBeforeCurrentTime += scheduleData[i].duration * 60;
    }

    const timeInCurrentActivity = elapsedTimeSeconds - activitiesBeforeCurrentTime;
    const remainingTime = activityDurationSec - timeInCurrentActivity;

    const timerElement = document.getElementById(`timer-display-${currentActivityIndex}`);
    if (timerElement) {
        timerElement.textContent = formatTime(remainingTime < 0 ? 0 : remainingTime);
    }

    if (timeInCurrentActivity >= activityDurationSec) {
        completeActivity(currentActivityIndex);
    }
}

function completeActivity(index) {
    if (index < 0 || index >= scheduleData.length) return;

    const completedActivity = scheduleData[index];

    let timeAtEndOfActivity = 0;
    for (let i = 0; i <= index; i++) {
        timeAtEndOfActivity += scheduleData[i].duration * 60;
    }

    let timeSavedSec = 0;
    if (elapsedTimeSeconds < timeAtEndOfActivity) {
        timeSavedSec = timeAtEndOfActivity - elapsedTimeSeconds;
        elapsedTimeSeconds = timeAtEndOfActivity;
    }

    scheduleData[index].status = 'done';

    if (timeSavedSec > 0) {
        const remainingActivities = scheduleData.slice(index + 1).filter(a => a.status !== 'done');

        if (remainingActivities.length > 0) {
            const timePerActivityMin = timeSavedSec / 60 / remainingActivities.length;

            remainingActivities.forEach(activity => {
                activity.duration += timePerActivityMin;
            });

            calculateTotalDuration();
        }
    }

    let nextIndex = index + 1;
    while (nextIndex < scheduleData.length && scheduleData[nextIndex].status !== 'pending') {
        nextIndex++;
    }

    currentActivityIndex = nextIndex;

    if (currentActivityIndex < scheduleData.length) {
        scheduleData[currentActivityIndex].status = 'current';
    } else {
        clearInterval(mainTimerInterval);
        finishLesson();
        return;
    }

    renderSchedule();
    updateMainTimerDisplay();
    updateProgressDisplay();
}

function finishLesson() {
    isRunning = false;
    clearInterval(mainTimerInterval);
    scheduleData.forEach(a => a.status = 'done');
    renderSchedule();
    updateMainTimerDisplay();

    if (victoryTrophyDisplay) {
        victoryTrophyDisplay.classList.add('is-active');
    }
    if (addActivityBtn) {
        addActivityBtn.classList.add('is-hidden');
    }
}

/**
 * Сменя страната (ляво/дясно) на дадена активност.
 * @param {number} index Индекс на активността в scheduleData.
 */
function toggleActivitySide(index) {
    if (isRunning || index < 0 || index >= scheduleData.length) return;

    const currentSide = scheduleData[index].side;
    scheduleData[index].side = currentSide === 'left' ? 'right' : 'left';
    renderSchedule();
}

// =================================================
// ФУНКЦИИ ЗА РЕНДИРАНЕ НА UI
// =================================================

function renderSchedule() {
    if (!timelineContainer || !timelineProgress) return;

    const startLabel = document.getElementById('label-start');
    const endLabelEl = document.getElementById('label-end');
    const line = timelineContainer.querySelector('.timeline-line');
    const progress = timelineContainer.querySelector('#timeline-progress');

    // Изчистване на предишните карти
    Array.from(timelineContainer.children).forEach(child => {
        if (child.classList.contains('timeline-item-wrapper')) {
            child.remove();
        }
    });

    scheduleData.forEach((activity, index) => {
        const wrapper = document.createElement('div');
        wrapper.id = `activity-${index}-wrapper`;
        wrapper.className = `timeline-item-wrapper ${activity.side === 'left' ? 'left-side' : 'right-side'}`;
        wrapper.setAttribute('draggable', !isRunning ? 'true' : 'false');
        wrapper.setAttribute('data-index', index);

        const item = document.createElement('div');
        item.id = `activity-${index}`;
        item.className = 'timeline-content';

        // Добавяне на клас за свиване на полето, ако няма изображение
        if (!activity.imageUrl) {
            item.classList.add('no-image');
        }

        if (activity.status === 'done') {
            item.classList.add('done-activity');
        } else if (activity.status === 'current') {
            item.classList.add('current-activity');
        } else {
            item.classList.add('pending-activity');
        }

        const header = document.createElement('div');
        header.className = 'timeline-header';

        const titleArea = document.createElement('div');
        titleArea.className = 'title-area';

        titleArea.innerHTML = `
            <div class="title-row">
                <span class="activity-title" title="${activity.title}">${activity.title}</span>
            </div>
        `;

        const rightArea = document.createElement('div');
        rightArea.className = 'timer-controls-area';

        const timerDisplay = document.createElement('span');
        timerDisplay.id = `timer-display-${index}`;
        timerDisplay.className = `activity-timer-display ${activity.status}-timer`;

        let plannedDuration = Math.round(activity.duration * 60);

        if (activity.status === 'current' && isRunning) {
            let activitiesBeforeCurrentTime = 0;
            for (let j = 0; j < index; j++) {
                activitiesBeforeCurrentTime += scheduleData[j].duration * 60;
            }
            const timeInCurrentActivity = elapsedTimeSeconds - activitiesBeforeCurrentTime;
            let remainingDuration = plannedDuration - timeInCurrentActivity;
            timerDisplay.textContent = formatTime(remainingDuration < 0 ? 0 : remainingDuration);
        } else {
            timerDisplay.textContent = formatTime(plannedDuration);
        }

        rightArea.appendChild(timerDisplay);

        header.appendChild(titleArea);
        header.appendChild(rightArea);
        item.appendChild(header);

        const controls = document.createElement('div');
        controls.className = 'activity-controls';

        // 1. Бутон за смяна на страна (ПЪРВИ по ред, ако таймерът е спрян)
        const sideSwitchBtn = document.createElement('button');
        sideSwitchBtn.className = 'controls-btn side-switch-button-control';
        sideSwitchBtn.title = activity.side === 'left' ? 'Премести надясно' : 'Премести наляво';
        sideSwitchBtn.innerHTML = activity.side === 'left' ? '⬅️' : '➡️';

        if (!isRunning) {
            sideSwitchBtn.onclick = () => toggleActivitySide(index);
            controls.appendChild(sideSwitchBtn);
        }

        // 2. Бутон за връзка (следващ по ред, ако има linkUrl)
        if (activity.linkUrl) {
            const linkBtn = document.createElement('button');
            linkBtn.className = 'controls-btn link-btn';
            linkBtn.title = "Отвори връзка";
            linkBtn.innerHTML = '🌍';
            controls.appendChild(linkBtn);
            linkBtn.onclick = () => window.open(activity.linkUrl, '_blank');
        }

        // =========================================================================
        // ⭐ ПРОМЯНА ТУК: Показва ✅ бутона САМО ако таймерът е стартиран (`isRunning`)
        // =========================================================================

        // 3. Бутон за приключване (следващ по ред, ако не е done И таймерът работи)
        if (activity.status !== 'done' && isRunning) {
            const finishBtn = document.createElement('button');
            finishBtn.className = 'controls-btn finish-btn';
            finishBtn.innerHTML = '✅';
            finishBtn.onclick = () => completeActivity(index);
            controls.appendChild(finishBtn);
        }

        // 4. Бутон за редактиране (следващ по ред, ако таймерът е спрян)
        const editBtn = document.createElement('button');
        editBtn.className = 'controls-btn edit-btn';
        editBtn.innerHTML = '✏️';
        editBtn.onclick = () => openModal(index);
        if (!isRunning) {
            controls.appendChild(editBtn);
        }

        // 5. Бутон за изтриване (последен по ред, ако таймерът е спрян)
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'controls-btn delete-btn';
        deleteBtn.innerHTML = '❌';
        deleteBtn.onclick = () => deleteActivity(index);
        if (!isRunning) {
            controls.appendChild(deleteBtn);
        }

        item.appendChild(controls); // Добавяме controls към item

        if (activity.imageUrl) {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'image-container';
            const img = document.createElement('img');
            img.className = 'activity-image';
            img.src = activity.imageUrl;
            img.alt = activity.title;
            imgContainer.onclick = () => openLightbox(activity.imageUrl);

            if (isRunning && activity.status !== 'current') {
                imgContainer.classList.add('is-hidden');
            }

            imgContainer.appendChild(img);
            item.appendChild(imgContainer);
        }

        wrapper.appendChild(item);

        if (endLabelEl && timelineContainer.contains(endLabelEl)) {
            timelineContainer.insertBefore(wrapper, endLabelEl);
        } else if (addActivityBtn && timelineContainer.contains(addActivityBtn)) {
            timelineContainer.insertBefore(wrapper, addActivityBtn);
        } else {
            timelineContainer.appendChild(wrapper);
        }
    });

    if (endLabelEl && !timelineContainer.contains(endLabelEl)) timelineContainer.appendChild(endLabelEl);
    if (addActivityBtn && !timelineContainer.contains(addActivityBtn)) timelineContainer.appendChild(addActivityBtn);

    if (startBtn && resetBtnCorner) {
        const isFinished = elapsedTimeSeconds >= totalDurationSeconds && totalDurationSeconds > 0;
        startBtn.disabled = scheduleData.length === 0 && !isFinished;

        if (isFinished) {
            startBtn.textContent = 'ЗАВЪРШЕНО';
            startBtn.style.backgroundColor = '#10b981';
            resetBtnCorner.style.display = 'block';
        } else if (isRunning) {
            startBtn.textContent = 'ПАУЗА';
            startBtn.style.backgroundColor = '#f59e0b';
            resetBtnCorner.style.display = 'block';
        } else if (elapsedTimeSeconds > 0) {
            startBtn.textContent = 'ПРОДЪЛЖИ';
            startBtn.style.backgroundColor = '#10b981';
            resetBtnCorner.style.display = 'block';
        } else {
            startBtn.textContent = 'СТАРТ';
            startBtn.style.backgroundColor = '#10b981';
            resetBtnCorner.style.display = 'none';
        }
    }

    updateProgressDisplay();
}

// =================================================
// ФУНКЦИИ (МОДАЛ, ИЗТРИВАНЕ, LIGHTBOX)
// =================================================

/**
 * Автоматично попълва полетата за заглавие, продължителност и изображение
 * въз основа на избрания шаблон.
 */
function autoFillActivity() {
    const selectedKey = activityTemplateSelect.value;
    const template = ACTIVITY_TEMPLATES[selectedKey];

    if (!template) return;

    // Автоматично попълване
    activityTitleInput.value = template.title;
    activityDurationInput.value = template.duration;
    activityImageInput.value = template.imageUrl;

    // Блокиране на полетата, ако не е избран 'custom'
    const isDisabled = selectedKey !== 'custom';
    activityTitleInput.readOnly = isDisabled;
    activityDurationInput.readOnly = isDisabled;
    activityImageInput.readOnly = isDisabled;
    activityLinkInput.readOnly = isDisabled;
}

function openModal(index = null) {
    if (isRunning) return;

    editActivityIndex = index;

    // Първо нулираме контролите и активираме всички input полета по подразбиране
    activityTitleInput.readOnly = false;
    activityDurationInput.readOnly = false;
    activityLinkInput.readOnly = false;
    activityImageInput.readOnly = false;
    activityTemplateSelect.value = 'custom';
    activityTemplateSelect.disabled = false; // <<< ГАРАНТИРАМЕ, че е АКТИВЕН по подразбиране

    if (index !== null) {
        modalTitle.textContent = 'Редактиране на Дейност';
        const activity = scheduleData[index];

        // Попълваме текущите стойности
        activityTitleInput.value = activity.title;
        activityDurationInput.value = activity.duration;
        activityLinkInput.value = activity.linkUrl || '';
        activityImageInput.value = activity.imageUrl || '';

        // При РЕДАКТИРАНЕ: Деактивираме избора на шаблон, тъй като работим с конкретен елемент
        activityTemplateSelect.disabled = true;

    } else {
        modalTitle.textContent = 'Добавяне на Дейност';

        // При ДОБАВЯНЕ: Селекторът е АКТИВЕН (disabled = false).
        // Инициализираме с 'custom' (който не блокира полетата)
        activityTemplateSelect.value = 'custom';
        activityTemplateSelect.disabled = false;
        autoFillActivity();
    }

    activityModal.classList.add('is-active');
}

function closeModal() {
    activityModal.classList.remove('is-active');
    editActivityIndex = null;
    activityTemplateSelect.disabled = false; // ОТКЛЮЧВАМЕ СЕЛЕКТОРА
}

function saveActivity() {
    const title = activityTitleInput.value.trim();
    const duration = parseFloat(activityDurationInput.value.replace(',', '.'));
    const linkUrl = activityLinkInput.value.trim();
    const imageUrl = activityImageInput.value.trim();

    if (!title || isNaN(duration) || duration <= 0) {
        alert('Моля, въведете валидно име и продължителност (по-голяма от 0).');
        return;
    }

    const newActivity = {
        title,
        duration,
        linkUrl,
        imageUrl,
        status: 'pending',
        side: 'left'
    };

    if (editActivityIndex !== null) {
        newActivity.status = scheduleData[editActivityIndex].status;
        newActivity.side = scheduleData[editActivityIndex].side;
        scheduleData[editActivityIndex] = newActivity;
    } else {
        scheduleData.push(newActivity);
    }

    closeModal();
    calculateTotalDuration();
    renderSchedule();
}

function deleteActivity(index) {
    if (isRunning) return;

    if (confirm(`Сигурни ли сте, че искате да изтриете дейността: "${scheduleData[index].title}"?`)) {
        if (currentActivityIndex !== -1) {
            if (index === currentActivityIndex) {
                currentActivityIndex = -1;
            } else if (index < currentActivityIndex) {
                currentActivityIndex--;
            }
        }

        scheduleData.splice(index, 1);

        if (scheduleData.length === 0) {
            elapsedTimeSeconds = 0;
            currentActivityIndex = -1;
        } else {
            if (currentActivityIndex >= scheduleData.length) {
                currentActivityIndex = -1;
            }
        }

        calculateTotalDuration();
        renderSchedule();
    }
}

function openLightbox(url) {
    lightboxImg.src = url;
    lightbox.classList.add('is-active');
}

function closeLightbox() {
    lightbox.classList.remove('is-active');
    lightboxImg.src = '';
}

// =================================================
// ИНИЦИАЛИЗАЦИЯ И ОБРАБОТКА НА СЪБИТИЯ
// =================================================

function initializeDOM() {
    // Елементи от DOM
    appContainer = document.getElementById('app');
    controlPanel = document.getElementById('control-panel');
    lessonTopicInput = document.getElementById('lesson-topic');
    mainTimerDisplay = document.getElementById('main-timer-display');
    startBtn = document.getElementById('start-btn');
    resetBtnCorner = document.getElementById('reset-btn-corner');
    timelineContainer = document.getElementById('timeline-container-centered');
    addActivityBtn = document.getElementById('add-activity-btn-single');
    timelineProgress = document.getElementById('timeline-progress');
    endLabel = document.getElementById('label-end');

    victoryTrophyDisplay = document.getElementById('victory-screen');

    // Модал елементи
    activityModal = document.getElementById('activity-modal');
    modalTitle = document.getElementById('modal-title');
    activityTemplateSelect = document.getElementById('activity-template-select'); // НОВ ЕЛЕМЕНТ
    activityTitleInput = document.getElementById('activity-title-input');
    activityDurationInput = document.getElementById('activity-duration-input');
    activityLinkInput = document.getElementById('activity-link-input');
    activityImageInput = document.getElementById('activity-image-input');
    modalSaveBtn = document.getElementById('modal-save-btn');
    modalCancelBtn = document.getElementById('modal-cancel-btn');

    // Lightbox елементи
    lightbox = document.getElementById('lightbox');
    lightboxImg = document.getElementById('lightbox-img');
    lightboxCloseBtn = document.querySelector('.lightbox-close-btn');
}

function setupEventListeners() {
    if (startBtn) startBtn.addEventListener('click', () => isRunning ? pauseTimer() : startTimer());
    if (resetBtnCorner) resetBtnCorner.addEventListener('click', resetSchedule);

    if (addActivityBtn) addActivityBtn.addEventListener('click', () => openModal(null));

    if (modalSaveBtn) modalSaveBtn.addEventListener('click', saveActivity);
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);

    // Обработка на избор на шаблон
    if (activityTemplateSelect) {
        activityTemplateSelect.addEventListener('change', autoFillActivity);
    }

    if (lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', closeLightbox);
    if (lightbox) lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    if (activityModal) activityModal.addEventListener('click', (e) => {
        if (e.target === activityModal) {
            closeModal();
        }
    });

    if (victoryTrophyDisplay) {
        victoryTrophyDisplay.addEventListener('click', (e) => {
            if (e.target === victoryTrophyDisplay || e.target.closest('#victory-screen')) {
                if (victoryTrophyDisplay.classList.contains('is-active')) {
                    resetSchedule();
                }
            }
        });
    }

    // DRAG & DROP
    if (timelineContainer) {
        timelineContainer.addEventListener('dragstart', (e) => {
            const target = e.target.closest('.timeline-item-wrapper');
            if (isRunning || !target || target.getAttribute('draggable') === 'false') {
                e.preventDefault();
                return;
            }

            draggedItem = target;
            setTimeout(() => draggedItem.classList.add('dragging'), 0);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', target.getAttribute('data-index'));
        });

        timelineContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const targetWrapper = e.target.closest('.timeline-item-wrapper');

            // Премахваме само класовете за drop target
            timelineContainer.querySelectorAll('.drop-target-above, .drop-target-below').forEach(el => {
                el.classList.remove('drop-target-above', 'drop-target-below');
            });
            dragOverTargetIndex = null;

            if (!draggedItem) return;

            // Логика за пренареждане върху ДРУГА карта
            if (targetWrapper && draggedItem !== targetWrapper) {
                const rect = targetWrapper.getBoundingClientRect();

                // Прагът за вертикално пускане
                const dropThreshold = rect.height / 4;
                const isAbove = e.clientY < rect.top + dropThreshold;
                const isBelow = e.clientY > rect.bottom - dropThreshold;

                if (isAbove) {
                    targetWrapper.classList.add('drop-target-above');
                    dragOverTargetIndex = parseInt(targetWrapper.getAttribute('data-index'));
                } else if (isBelow) {
                    targetWrapper.classList.add('drop-target-below');
                    dragOverTargetIndex = parseInt(targetWrapper.getAttribute('data-index')) + 1;
                }
            } else if (draggedItem) {
                // Ако е пуснато над End Label или Add Button
                if (e.target.closest('#label-end') || e.target.closest('#add-activity-btn-single')) {
                    dragOverTargetIndex = scheduleData.length;
                }
            }
        });


        timelineContainer.addEventListener('drop', (e) => {
            e.preventDefault();

            const fromIndex = draggedItem ? parseInt(draggedItem.getAttribute('data-index')) : -1;
            if (fromIndex === -1) {
                timelineContainer.querySelectorAll('.drop-target-above, .drop-target-below').forEach(el => el.classList.remove('drop-target-above', 'drop-target-below'));
                dragOverTargetIndex = null;
                return;
            }

            // Логика за ПРЕНАРЕЖДАНЕ (СОРТИРАНЕ)
            const toIndex = dragOverTargetIndex;

            if (toIndex !== null && fromIndex !== toIndex && fromIndex + 1 !== toIndex) {
                const [movedActivity] = scheduleData.splice(fromIndex, 1);

                const finalIndex = toIndex > fromIndex ? toIndex - 1 : toIndex;

                scheduleData.splice(finalIndex, 0, movedActivity);

                // Актуализация на currentActivityIndex
                if (currentActivityIndex !== -1) {
                    if (currentActivityIndex === fromIndex) {
                        currentActivityIndex = finalIndex;
                    } else if (currentActivityIndex > fromIndex && currentActivityIndex <= finalIndex) {
                        currentActivityIndex--;
                    } else if (currentActivityIndex < fromIndex && currentActivityIndex >= finalIndex) {
                        currentActivityIndex++;
                    }
                }

                calculateTotalDuration();
                renderSchedule();
            }


            // Почистване
            timelineContainer.querySelectorAll('.drop-target-above, .drop-target-below').forEach(el => {
                el.classList.remove('drop-target-above', 'drop-target-below');
            });
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
            }
            dragOverTargetIndex = null;
        });

        timelineContainer.addEventListener('dragend', (e) => {
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
            }
            timelineContainer.querySelectorAll('.drop-target-above, .drop-target-below').forEach(el => {
                el.classList.remove('drop-target-above', 'drop-target-below');
            });
            dragOverTargetIndex = null;
        });
    }
}

// =================================================
// СТАРТ
// =================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeDOM();
    setupEventListeners();
    calculateTotalDuration();
    renderSchedule();
});