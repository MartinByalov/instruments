// planner.js
let appContainer;
let controlPanel;
let lessonTopicInput;
let lessonSelectDropdown;
let mainTimerDisplay;
let startBtn;
let endLessonBtn;
let timelineContainer;
let addActivityBtn;
let timelineProgress;
let victoryTrophyDisplay;
let activityModal;
let modalTitle;
let activityTemplateSelect;
let activityTitleInput;
let activityDurationInput;
let activityLinkInput;
let activityImageInput;
let imageUploadInput;
let modalSaveBtn;
let modalCancelBtn;
let imageUploadButtonContainer;
let lightbox;
let lightboxImg;
let lightboxCloseBtn;
let importPlanBtn;
let exportPlanBtn;
let fileInput;
let downloadTemplateBtn;
let startSound;
let activityCompleteSound;
let lessonCompleteSound;
let scheduleData = [
    { title: 'Начална дейност', duration: 5, linkUrl: '', imageUrl: '', status: 'pending', side: 'right' },
];
let importedLessons = [];
let totalDurationSeconds = 0;
let mainTimerInterval;
let elapsedTimeSeconds = 0;
let isRunning = false;
let currentActivityIndex = -1;
let editActivityIndex = null;
let draggedItem = null;
let dragOverTargetIndex = null;
const ACTIVITY_TEMPLATES = {
    'exercise': {
        title: 'Упражнение',
        duration: 5,
        imageUrl: 'https://i.ibb.co/49X7VMs/task.png',
    },
    'practical_task': {
        title: 'Практическа задача',
        duration: 10,
        imageUrl: 'https://i.ibb.co/2153GK5s/practical-task.jpg',
    },
    'group_task': {
        title: 'Групова задача',
        duration: 15,
        imageUrl: 'https://i.ibb.co/DH6zMLYW/team-task.jpg',
    },
    'custom': {
        title: '',
        duration: 15,
        imageUrl: '',
    }
};
function playNotificationSound(sound) {
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.error("Could not play sound:", e));
    }
}
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
        const totalLineHeight = timelineContainerEl.scrollHeight - 40; 
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
    playNotificationSound(startSound);
    startBtn.textContent = 'ПАУЗА';
    startBtn.style.backgroundColor = '#f59e0b';
    if (endLessonBtn) {
        endLessonBtn.textContent = 'ФИНАЛ';
        endLessonBtn.disabled = true;
        endLessonBtn.setAttribute('data-state', 'final');
        endLessonBtn.style.cursor = 'default';
        endLessonBtn.style.opacity = '0.7';
    }
    if (addActivityBtn) {
        addActivityBtn.classList.add('is-hidden');
    }
    if (lessonSelectDropdown) {
        lessonSelectDropdown.classList.add('is-hidden');
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
        updateTimelineInfo();
        checkActivityCompletion();
        if (elapsedTimeSeconds >= totalDurationSeconds) {
            clearInterval(mainTimerInterval);
            finishLesson();
        }
    }, 1000);
}
function pauseTimer() {
    if (!isRunning) return;
    clearInterval(mainTimerInterval);
    isRunning = false;
    startBtn.textContent = 'СТАРТ';
    startBtn.style.backgroundColor = '#10b981';
    if (endLessonBtn) {
        endLessonBtn.textContent = 'КРАЙ';
        endLessonBtn.disabled = false;
        endLessonBtn.setAttribute('data-state', 'end');
        endLessonBtn.style.cursor = 'pointer';
        endLessonBtn.style.opacity = '1';
    }
    renderSchedule();
}
function toggleTimer() {
    if (isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
}
function resetLesson() {
    clearInterval(mainTimerInterval);
    elapsedTimeSeconds = 0;
    currentActivityIndex = -1;
    isRunning = false;
    scheduleData.forEach(a => a.status = 'pending');
    calculateTotalDuration();
    startBtn.textContent = 'СТАРТ';
    startBtn.style.backgroundColor = '#10b981';
    startBtn.disabled = scheduleData.length === 0;
    if (endLessonBtn) {
        endLessonBtn.textContent = 'КРАЙ';
        endLessonBtn.disabled = false;
        endLessonBtn.setAttribute('data-state', 'end');
        endLessonBtn.style.cursor = 'pointer';
        endLessonBtn.style.opacity = '1';
    }
    if (victoryTrophyDisplay) {
        victoryTrophyDisplay.classList.remove('is-active');
    }
    if (addActivityBtn) {
        addActivityBtn.classList.remove('is-hidden');
    }
    if (lessonSelectDropdown && importedLessons.length > 1) {
        lessonSelectDropdown.classList.remove('is-hidden');
        lessonSelectDropdown.style.display = 'inline-block';
    }
    const timelineInfo = document.getElementById('timeline-progress-info');
    if (timelineInfo) timelineInfo.classList.add('is-hidden');
    updateTimelineInfo();
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
function updateTimelineInfo() {
    const elapsedTimeInfo = document.getElementById('elapsed-time-info');
    const remainingTimeInfo = document.getElementById('remaining-time-info');
    const elapsedMinutes = Math.floor(elapsedTimeSeconds / 60);
    const remainingSeconds = totalDurationSeconds - elapsedTimeSeconds;
    const remainingMinutes = Math.ceil(remainingSeconds / 60);
    if (elapsedTimeInfo) elapsedTimeInfo.textContent = `${elapsedMinutes} мин.`;
    if (remainingTimeInfo) remainingTimeInfo.textContent = `${remainingMinutes} мин.`;
}
function completeActivity(index) {
    if (index < 0 || index >= scheduleData.length) return;
    playNotificationSound(activityCompleteSound);
    let timeAtEndOfActivity = 0;
    for (let i = 0; i <= index; i++) {
        timeAtEndOfActivity += scheduleData[i].duration * 60;
    }
    const timeSavedSec = timeAtEndOfActivity - elapsedTimeSeconds;
    elapsedTimeSeconds = timeAtEndOfActivity;
    scheduleData[index].status = 'done';
    if (timeSavedSec > 0) {
        const remainingActivities = scheduleData.slice(index + 1).filter(a => a.status !== 'done');
        if (remainingActivities.length > 0) {
            const timePerActivityMin = timeSavedSec / 60 / remainingActivities.length;
            remainingActivities.forEach(activity => {
                activity.duration = activity.duration + timePerActivityMin;
                if (activity.duration < 0.1) activity.duration = 0.1;
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
        if (isRunning) playNotificationSound(startSound);
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
    clearInterval(mainTimerInterval);
    isRunning = false;
    currentActivityIndex = -1;
    elapsedTimeSeconds = totalDurationSeconds;
    scheduleData.forEach(a => a.status = 'done');
    startBtn.textContent = 'СТАРТ';
    startBtn.style.backgroundColor = '#10b981';
    startBtn.disabled = true;
    if (endLessonBtn) {
        endLessonBtn.textContent = 'КРАЙ';
        endLessonBtn.disabled = false;
        endLessonBtn.setAttribute('data-state', 'end');
        endLessonBtn.style.cursor = 'pointer';
        endLessonBtn.style.opacity = '1';
    }
    if (addActivityBtn) {
        addActivityBtn.classList.remove('is-hidden');
    }
    if (lessonSelectDropdown && importedLessons.length > 1) {
        lessonSelectDropdown.classList.remove('is-hidden');
        lessonSelectDropdown.style.display = 'inline-block';
    }
    playNotificationSound(lessonCompleteSound);
    if (victoryTrophyDisplay) {
        victoryTrophyDisplay.classList.add('is-active');
    }
    renderSchedule();
    updateMainTimerDisplay();
    updateProgressDisplay();
}
function toggleActivitySide(index) {
    if (index < 0 || index >= scheduleData.length) return;
    const currentSide = scheduleData[index].side;
    scheduleData[index].side = currentSide === 'left' ? 'right' : 'left';
    renderSchedule();
}
function renderSchedule() {
    if (!timelineContainer) return;
    const line = timelineContainer.querySelector('.timeline-line');
    const progress = timelineContainer.querySelector('#timeline-progress');
    const startResetContainer = timelineContainer.querySelector('#start-reset-container');
    const addActivityBtnSingle = timelineContainer.querySelector('#add-activity-btn-single');
    const endLessonEl = timelineContainer.querySelector('#end-lesson-btn');
    const labelEndEl = timelineContainer.querySelector('#label-end');
    const wrappers = timelineContainer.querySelectorAll('.timeline-item-wrapper');
    wrappers.forEach(w => w.remove());
    const fixedElements = [
        startResetContainer,
        line,
        progress,
        document.getElementById('timeline-progress-info'),
        endLessonEl,
        labelEndEl,
        addActivityBtnSingle
    ];
    fixedElements.forEach(el => {
        if (el && !timelineContainer.contains(el)) {
            timelineContainer.appendChild(el);
        }
    });
    scheduleData.forEach((activity, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = `timeline-item-wrapper ${activity.side}-side`;
        wrapper.setAttribute('data-index', index);
        wrapper.setAttribute('draggable', isRunning ? 'false' : 'true');
        const item = document.createElement('div');
        item.className = `timeline-content ${activity.status}-activity ${activity.imageUrl ? '' : 'no-image'}`;
        item.setAttribute('data-index', index);
        const header = document.createElement('div');
        header.className = 'timeline-header';
        const titleArea = document.createElement('div');
        titleArea.className = 'title-area';
        titleArea.innerHTML = `
            <div class="title-row">
                <span class="activity-title" title="${activity.title}">${activity.title}</span>
            </div>
        `;
        header.appendChild(titleArea);
        item.appendChild(header);
        const controls = document.createElement('div');
        controls.className = 'activity-controls';
        if (activity.linkUrl) {
            const linkBtn = document.createElement('button');
            linkBtn.className = 'controls-btn link-btn';
            linkBtn.title = "Отвори уебсайт";
            linkBtn.innerHTML = '🌐';
            controls.appendChild(linkBtn);
            linkBtn.onclick = () => window.open(activity.linkUrl, '_blank');
        }
        if (index === currentActivityIndex && isRunning) {
            const finishBtn = document.createElement('button');
            finishBtn.className = 'controls-btn finish-btn';
            finishBtn.innerHTML = '✅';
            finishBtn.title = 'Завърши дейността предсрочно';
            finishBtn.onclick = () => completeActivity(index);
            controls.appendChild(finishBtn);
        }
        const editBtn = document.createElement('button');
        editBtn.className = 'controls-btn edit-btn';
        editBtn.innerHTML = '✏️';
        editBtn.title = 'Редактирай дейността';
        editBtn.onclick = () => openModal(index);
        if (!isRunning) {
            controls.appendChild(editBtn);
        }
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'controls-btn delete-btn';
        deleteBtn.innerHTML = '❌';
        deleteBtn.title = 'Изтрий дейността';
        deleteBtn.onclick = () => deleteActivity(index);
        if (!isRunning) {
            controls.appendChild(deleteBtn);
        }
        item.appendChild(controls);
        const contentArea = document.createElement('div');
        contentArea.className = 'content-area';
        let displayImageUrl = activity.imageUrl;
        if (displayImageUrl) {
            const imageContainer = document.createElement('div');
            imageContainer.className = 'image-container';
            imageContainer.onclick = () => openLightbox(displayImageUrl);
            const image = document.createElement('img');
            image.className = 'activity-image';
            image.src = displayImageUrl;
            image.alt = activity.title;
            imageContainer.appendChild(image);
            contentArea.appendChild(imageContainer);
        }
        item.appendChild(contentArea);
        const bottomControls = document.createElement('div');
        bottomControls.className = 'activity-bottom-controls';
        const durationText = document.createElement('span');
        durationText.className = 'activity-plan-text';
        durationText.textContent = `Продължителност: ${activity.duration} мин.`;
        bottomControls.appendChild(durationText);
        const sideSwitchBtn = document.createElement('button');
        sideSwitchBtn.className = 'controls-btn side-switch-button-control';
        sideSwitchBtn.title = activity.side === 'left' ? 'Премести надясно' : 'Премести наляво';
        sideSwitchBtn.innerHTML = '↔️';
        if (!isRunning) {
            sideSwitchBtn.onclick = () => toggleActivitySide(index);
        }
        bottomControls.appendChild(sideSwitchBtn);
        const timerDisplay = document.createElement('span');
        timerDisplay.id = `timer-display-${index}`;
        timerDisplay.className = `activity-timer-display ${activity.status}-timer`;
        if (activity.status === 'current') {
            let activitiesBeforeCurrentTime = 0;
            for (let i = 0; i < index; i++) {
                activitiesBeforeCurrentTime += scheduleData[i].duration * 60;
            }
            const timeInCurrentActivity = elapsedTimeSeconds - activitiesBeforeCurrentTime;
            const remainingTime = (activity.duration * 60) - timeInCurrentActivity;
            timerDisplay.textContent = formatTime(remainingTime < 0 ? 0 : remainingTime);
        } else {
            // Промяна: За 'done' (завършена) и 'pending' (предстояща) активност показваме планираната продължителност.
            // При 'done' статус, класът 'done-timer' ще оцвети текста в зелено, както е по заявка, без да се изписва 'ГОТОВО'.
            timerDisplay.textContent = formatTime(activity.duration * 60);
        }
        bottomControls.appendChild(timerDisplay);
        item.appendChild(bottomControls);
        wrapper.appendChild(item);
        const insertBeforeTarget = labelEndEl || endLessonEl || addActivityBtnSingle;
        if (insertBeforeTarget) {
            timelineContainer.insertBefore(wrapper, insertBeforeTarget);
        } else {
            timelineContainer.appendChild(wrapper);
        }
    });
    if (startBtn) {
        const isFinished = scheduleData.every(a => a.status === 'done') && scheduleData.length > 0;
        if (isRunning) {
            startBtn.textContent = 'ПАУЗА';
            startBtn.style.backgroundColor = '#f59e0b';
            startBtn.disabled = false;
        } else if (elapsedTimeSeconds > 0) {
            startBtn.textContent = 'СТАРТ';
            startBtn.style.backgroundColor = '#10b981';
            startBtn.disabled = isFinished;
        } else {
            startBtn.textContent = 'СТАРТ';
            startBtn.style.backgroundColor = '#10b981';
            startBtn.disabled = scheduleData.length === 0;
        }
    }
    if (endLessonBtn) {
        endLessonBtn.style.display = 'block';
        if (isRunning) {
            endLessonBtn.textContent = 'ФИНАЛ';
            endLessonBtn.disabled = true;
            endLessonBtn.setAttribute('data-state', 'final');
            endLessonBtn.style.cursor = 'default';
            endLessonBtn.style.opacity = '0.7';
        } else if (elapsedTimeSeconds === 0 && !isRunning) {
            endLessonBtn.textContent = 'КРАЙ';
            endLessonBtn.disabled = false;
            endLessonBtn.setAttribute('data-state', 'end');
            endLessonBtn.style.cursor = 'pointer';
            endLessonBtn.style.opacity = '1';
        } else if (elapsedTimeSeconds > 0 && !isRunning) {
            endLessonBtn.textContent = 'КРАЙ';
            endLessonBtn.disabled = false;
            endLessonBtn.setAttribute('data-state', 'end');
            endLessonBtn.style.cursor = 'pointer';
            endLessonBtn.style.opacity = '1';
        }
    }
    updateProgressDisplay();
}
function openModal(index) {
    if (isRunning) return;
    editActivityIndex = index;
    if (index !== null) {
        modalTitle.textContent = 'Редактиране на Дейност';
        const activity = scheduleData[index];
        activityTemplateSelect.value = 'custom';
        activityTitleInput.value = activity.title;
        activityDurationInput.value = activity.duration;
        activityLinkInput.value = activity.linkUrl;
        activityImageInput.value = activity.imageUrl;
        activityTitleInput.readOnly = false;
        activityDurationInput.readOnly = false;
        activityImageInput.readOnly = false;
        activityLinkInput.readOnly = false;
    } else {
        modalTitle.textContent = 'Добавяне на Дейност';
        activityTemplateSelect.value = 'custom';
        activityTitleInput.value = '';
        activityDurationInput.value = 15;
        activityLinkInput.value = '';
        activityImageInput.value = '';
        activityTitleInput.readOnly = false;
        activityDurationInput.readOnly = false;
        activityImageInput.readOnly = false;
        activityLinkInput.readOnly = false;
    }
    activityModal.classList.add('is-active');
    activityTitleInput.focus();
}
function closeModal() {
    activityModal.classList.remove('is-active');
    editActivityIndex = null;
    if (imageUploadInput) imageUploadInput.value = '';
    const fileNameDisplay = document.querySelector('.file-name-display');
    if (fileNameDisplay) fileNameDisplay.remove();
}
function autoFillActivity() {
    const selectedKey = activityTemplateSelect.value;
    const template = ACTIVITY_TEMPLATES[selectedKey];
    if (!template) return;
    activityTitleInput.value = template.title;
    activityDurationInput.value = template.duration;
    activityImageInput.value = template.imageUrl;
    const isDisabled = selectedKey !== 'custom';
    activityTitleInput.readOnly = isDisabled;
    activityDurationInput.readOnly = isDisabled;
    activityImageInput.readOnly = isDisabled;
    activityLinkInput.readOnly = isDisabled;
    if (imageUploadInput) imageUploadInput.value = '';
}
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        alert('Моля, изберете валиден файл с изображение.');
        event.target.value = '';
        return;
    }
    const uploadButtonEl = imageUploadButtonContainer.querySelector('.upload-btn');
    const originalButtonText = uploadButtonEl.textContent;
    let fileNameDisplay = imageUploadButtonContainer.parentElement.querySelector('.file-name-display');
    if (!fileNameDisplay) {
        fileNameDisplay = document.createElement('span');
        fileNameDisplay.className = 'file-name-display';
        imageUploadButtonContainer.parentElement.insertBefore(fileNameDisplay, imageUploadButtonContainer.nextSibling); 
    }
    try {
        uploadButtonEl.textContent = '...';
        imageUploadButtonContainer.disabled = true;
        fileNameDisplay.textContent = `Четене на: ${file.name}...`;
        const base64Image = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64Data = reader.result.split(',')[1];
                resolve(base64Data);
            };
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
        uploadButtonEl.textContent = '...';
        fileNameDisplay.textContent = `Качвам: ${file.name}...`;
        const response = await fetch('/api/upload-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                base64Image: base64Image,
                fileName: file.name
            })
        });
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            const errorText = errorBody.message || response.statusText;
            throw new Error(`Upload failed: ${response.status} ${errorText}`);
        }
        const result = await response.json();
        const imageUrl = result.url;
        if (!imageUrl) {
            throw new Error('Upload successful, but no URL returned from server.');
        }
        activityImageInput.value = imageUrl;
        fileNameDisplay.textContent = `Успешно качен: ${file.name}`;
        setTimeout(() => {
             if (fileNameDisplay.parentElement) {
                fileNameDisplay.remove();
            }
        }, 3000);
    } catch (error) {
        console.error('Image upload error:', error);
        activityImageInput.value = '';
        const displayErrorMessage = `Грешка при качване. ${error.message.substring(0, 50)}...`;
        fileNameDisplay.textContent = displayErrorMessage;
        alert(`Грешка при качване на изображението: ${error.message}. Моля, въведете URL ръчно.`);
    } finally {
        uploadButtonEl.textContent = originalButtonText;
        imageUploadButtonContainer.disabled = false;
        event.target.value = '';
    }
}
function saveActivity() {
    const title = activityTitleInput.value.trim();
    const duration = parseFloat(activityDurationInput.value);
    const linkUrl = activityLinkInput.value.trim();
    let imageUrl = activityImageInput.value.trim();
    if (imageUrl.includes("Качен файл") || imageUrl.includes("Грешка при качване")) {
        imageUrl = '';
    }
    if (!title || isNaN(duration) || duration <= 0) {
        alert('Моля, въведете Заглавие.');
        return;
    }
    if (activityTemplateSelect.value === 'custom' && activityTitleInput.readOnly) {
         activityTitleInput.readOnly = false;
         activityDurationInput.readOnly = false;
         activityImageInput.readOnly = false;
         activityLinkInput.readOnly = false;
    }
    const newActivity = { 
        title, 
        duration, 
        linkUrl, 
        imageUrl, 
        status: 'pending', 
        side: editActivityIndex !== null ? scheduleData[editActivityIndex].side : (scheduleData.length % 2 === 0 ? 'right' : 'left')
    };
    if (editActivityIndex !== null) {
        newActivity.status = scheduleData[editActivityIndex].status;
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
        let activityStatus = scheduleData[index].status;
        scheduleData.splice(index, 1);
        if (isRunning) {
            if (index < currentActivityIndex) {
                currentActivityIndex--;
            } else if (index === currentActivityIndex) {
                let nextIndex = index;
                while (nextIndex < scheduleData.length && scheduleData[nextIndex].status !== 'pending') {
                    nextIndex++;
                }
                currentActivityIndex = nextIndex < scheduleData.length ? nextIndex : -1;
                if (currentActivityIndex >= 0) {
                     scheduleData[currentActivityIndex].status = 'current';
                     playNotificationSound(startSound);
                } else {
                    finishLesson();
                }
            }
        }
        if (scheduleData.length === 0) {
            elapsedTimeSeconds = 0;
            currentActivityIndex = -1;
            isRunning = false;
        }
        calculateTotalDuration();
        renderSchedule();
        if (startBtn) {
            startBtn.textContent = 'СТАРТ';
            startBtn.style.backgroundColor = '#10b981';
            startBtn.disabled = scheduleData.length === 0;
        }
        if (endLessonBtn) {
            endLessonBtn.disabled = elapsedTimeSeconds === 0;
        }
    }
}
function openLightbox(imageUrl) {
    lightboxImg.src = imageUrl;
    lightbox.classList.add('is-active');
}
function closeLightbox() {
    lightbox.classList.remove('is-active');
}
function downloadTemplate() {
    // Промяна: Изтегляне на съществуващ файл от templates папката
    const templateUrl = '/tools/planner/templates/lesson_plan_template.xlsx';
    
    // Създаване на временна връзка за изтегляне
    const link = document.createElement('a');
    link.href = templateUrl;
    link.download = 'lesson_plan_template.xlsx';
    link.style.display = 'none';
    
    // Добавяне към DOM, кликване и премахване
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
function handleFileImport(event) {
    if (isRunning) return;
    const file = event.target.files[0];
    if (!file) {
        event.target.value = '';
        return;
    }
    const fileName = file.name.toLowerCase();
    const isXLSX = fileName.endsWith('.xlsx');
    const isCSV = fileName.endsWith('.csv');
    const isJSON = fileName.endsWith('.json');
    const type = isXLSX ? 'Excel' : isCSV ? 'CSV' : isJSON ? 'JSON' : 'Файл';
    if (!isXLSX && !isCSV) {
        alert('Поддържат се само .xlsx и .csv файлове.');
        event.target.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = async function (e) {
        const data = new Uint8Array(e.target.result);
        let workbook;
        const options = { type: 'buffer' };
        try {
            if (isCSV) {
                let csvContent;
                let encoding;
                if (data[0] === 0xFF && data[1] === 0xFE) {
                    encoding = 'utf-16le';
                } else {
                    encoding = 'windows-1251';
                }
                try {
                    csvContent = new TextDecoder(encoding).decode(data);
                } catch (e) {
                    console.log(`Failed to decode with ${encoding}, trying UTF-8 fallback.`);
                    csvContent = new TextDecoder('utf-8').decode(data);
                }
                workbook = XLSX.read(csvContent, { type: 'string', ...options });
            } else {
                workbook = XLSX.read(data, { type: 'array', ...options });
            }
            let lessons = [];
            workbook.SheetNames.forEach((sheetName, index) => {
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                if (json.length < 2) return;
                let lessonTopic = sheetName.trim() || `Импортиран урок от XLSX ${index + 1}`;
                const activities = [];
                const activityTitleCol = 1;
                const durationCol = 2;
                const resourceCol = 3;
                const imageCol = 4;
                for (let i = 1; i < json.length; i++) {
                    const row = json[i];
                    const activityTitle = (row[activityTitleCol] || '').toString().trim();
                    const duration = parseFloat((row[durationCol] || '0').toString().replace(',', '.'));
                    const resourceField = (row[resourceCol] || '').toString().trim();
                    const imageField = (row[imageCol] || '').toString().trim();
                    let linkUrl = resourceField;
                    let imageUrl = imageField;
                    if (!imageUrl && linkUrl) {
                        if (linkUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i)) {
                            imageUrl = linkUrl;
                            linkUrl = '';
                        }
                    }
                    if (activityTitle && !isNaN(duration) && duration > 0) {
                        activities.push({
                            title: activityTitle,
                            duration: duration,
                            linkUrl: linkUrl,
                            imageUrl: imageUrl,
                            status: 'pending',
                            side: 'left'
                        });
                    }
                }
                if (activities.length > 0) {
                    lessons.push({
                        lessonTopic: lessonTopic,
                        scheduleData: activities
                    });
                }
            });
            importedLessons = lessons;
            if (lessons.length > 0) {
                updateLessonDropdown(lessons);
                loadLesson(lessons[0]);
                alert(`Успешно импортиране на ${lessons.length} урок(а) от ${type}.`);
            } else {
                alert('Файлът е импортиран, но не са открити валидни уроци.');
            }
        } catch (error) {
            console.error('File import error:', error);
            alert(`Грешка при импортиране на файл: ${error.message}`);
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
}
function updateLessonDropdown(lessons) {
    if (!lessonSelectDropdown) return;
    lessonSelectDropdown.innerHTML = '';
    if (lessons.length <= 1) {
        lessonSelectDropdown.style.display = 'none';
        return;
    }
    lessons.forEach((lesson, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = lesson.lessonTopic;
        lessonSelectDropdown.appendChild(option);
    });
    lessonSelectDropdown.classList.remove('is-hidden');
    lessonSelectDropdown.style.display = 'inline-block';
}
function loadLesson(lesson) {
    if (isRunning) return;
    resetLesson();
    lessonTopicInput.value = lesson.lessonTopic;
    scheduleData = lesson.scheduleData.map(activity => ({
        ...activity,
        status: 'pending',
        side: activity.side || 'left',
    }));
    calculateTotalDuration();
    renderSchedule();
}
function initializeDOM() {
    appContainer = document.getElementById('app');
    controlPanel = document.getElementById('control-panel');
    lessonTopicInput = document.getElementById('lesson-topic');
    lessonSelectDropdown = document.getElementById('lesson-select-dropdown');
    mainTimerDisplay = document.getElementById('main-timer-display');
    startBtn = document.getElementById('start-btn');
    timelineContainer = document.getElementById('timeline-container-centered');
    addActivityBtn = document.getElementById('add-activity-btn-single');
    timelineProgress = document.getElementById('timeline-progress');
    victoryTrophyDisplay = document.getElementById('victory-screen');
    endLessonBtn = document.getElementById('end-lesson-btn');
    if (!endLessonBtn) {
        endLessonBtn = document.createElement('button');
        endLessonBtn.id = 'end-lesson-btn';
        endLessonBtn.textContent = 'КРАЙ';
        endLessonBtn.disabled = false;
        endLessonBtn.setAttribute('data-state', 'end');
        timelineContainer.appendChild(endLessonBtn);
    }
    activityModal = document.getElementById('activity-modal');
    modalTitle = document.getElementById('modal-title');
    activityTemplateSelect = document.getElementById('activity-template-select');
    activityTitleInput = document.getElementById('activity-title-input');
    activityDurationInput = document.getElementById('activity-duration-input');
    activityLinkInput = document.getElementById('activity-link-input');
    activityImageInput = document.getElementById('activity-image-input');
    imageUploadInput = document.getElementById('image-upload-input');
    modalSaveBtn = document.getElementById('modal-save-btn');
    modalCancelBtn = document.getElementById('modal-cancel-btn');
    imageUploadButtonContainer = document.getElementById('image-upload-btn-container');
    lightbox = document.getElementById('lightbox');
    lightboxImg = document.getElementById('lightbox-img');
    lightboxCloseBtn = document.getElementById('lightbox-close-btn');
    importPlanBtn = document.getElementById('import-plan-btn');
    fileInput = document.getElementById('file-input');
    downloadTemplateBtn = document.getElementById('download-template-btn');
    startSound = document.getElementById('sound-start');
    activityCompleteSound = document.getElementById('sound-activity-complete');
    lessonCompleteSound = document.getElementById('sound-lesson-complete');
}
function setupEventListeners() {
    if (startBtn) startBtn.addEventListener('click', toggleTimer);
    if (endLessonBtn) {
        endLessonBtn.addEventListener('click', () => {
            if (isRunning) {
                return;
            } else {
                resetLesson();
            }
        });
    }
    if (victoryTrophyDisplay) {
        victoryTrophyDisplay.addEventListener('click', () => {
            resetLesson();
        });
    }
    if (addActivityBtn) addActivityBtn.addEventListener('click', () => openModal(null));
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);
    if (modalSaveBtn) modalSaveBtn.addEventListener('click', saveActivity);
    if (lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', closeLightbox);
    appContainer.addEventListener('click', (e) => {
        if (e.target.id === 'activity-modal') closeModal();
    });
    if (activityTemplateSelect) activityTemplateSelect.addEventListener('change', autoFillActivity);
    if (imageUploadInput) imageUploadInput.addEventListener('change', handleImageUpload);
    if (imageUploadButtonContainer && imageUploadInput) {
        imageUploadButtonContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            imageUploadInput.click();
        });
    }
    if (downloadTemplateBtn) downloadTemplateBtn.addEventListener('click', downloadTemplate);
    if (importPlanBtn) {
        importPlanBtn.addEventListener('click', () => fileInput.click());
    }
    if (fileInput) {
        fileInput.addEventListener('change', handleFileImport);
    }
    if (lessonSelectDropdown) {
        lessonSelectDropdown.addEventListener('change', (event) => {
            const index = parseInt(event.target.value);
            if (!isNaN(index) && importedLessons[index]) {
                loadLesson(importedLessons[index]);
            }
        });
    }
    setupDragAndDrop();
}
function setupDragAndDrop() {
    if (!timelineContainer) return;
    timelineContainer.addEventListener('dragstart', (e) => {
        if (isRunning) return;
        const target = e.target.closest('.timeline-item-wrapper');
        if (target && target.draggable) {
            draggedItem = target;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', target.dataset.index);
            setTimeout(() => target.classList.add('dragging'), 0);
        }
    });
    timelineContainer.addEventListener('dragover', (e) => {
        if (isRunning) return;
        e.preventDefault();
        const target = e.target.closest('.timeline-item-wrapper');
        timelineContainer.querySelectorAll('.drop-target-above, .drop-target-below').forEach(el => {
            el.classList.remove('drop-target-above', 'drop-target-below');
        });
        if (target && draggedItem && target !== draggedItem) {
            const rect = target.getBoundingClientRect();
            const offset = e.clientY - rect.top;
            const targetIndex = parseInt(target.dataset.index);
            if (offset < rect.height / 2) {
                target.classList.add('drop-target-above');
                dragOverTargetIndex = targetIndex;
            } else {
                target.classList.add('drop-target-below');
                dragOverTargetIndex = targetIndex + 1;
            }
            e.dataTransfer.dropEffect = 'move';
        } else {
            dragOverTargetIndex = null;
        }
    });
    timelineContainer.addEventListener('dragleave', (_e) => {
        if (isRunning) return;
        timelineContainer.querySelectorAll('.drop-target-above, .drop-target-below').forEach(el => {
            el.classList.remove('drop-target-above', 'drop-target-below');
        });
    });
    timelineContainer.addEventListener('drop', (e) => {
        if (isRunning) return;
        e.preventDefault();
        if (draggedItem && dragOverTargetIndex !== null) {
            const fromIndex = parseInt(draggedItem.dataset.index);
            let toIndex = dragOverTargetIndex;
            if (fromIndex < toIndex) {
                toIndex--;
            }
            if (fromIndex !== toIndex) {
                const [movedActivity] = scheduleData.splice(fromIndex, 1);
                scheduleData.splice(toIndex, 0, movedActivity);
                let finalIndex = toIndex;
                if (fromIndex < toIndex) finalIndex = toIndex - 1;
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
            timelineContainer.querySelectorAll('.drop-target-above, .drop-target-below').forEach(el => {
                el.classList.remove('drop-target-above', 'drop-target-below');
            });
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
            }
            dragOverTargetIndex = null;
        }
    });
    timelineContainer.addEventListener('dragend', (_e) => {
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
document.addEventListener('DOMContentLoaded', () => {
    initializeDOM();
    setupEventListeners();
    calculateTotalDuration();
    renderSchedule();
});