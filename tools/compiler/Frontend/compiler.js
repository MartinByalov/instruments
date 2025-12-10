const API_BASE_URL = '/api/run-code';

let codeEditorInstance;
const EXERCISES_STORAGE_KEY = 'csharp_exercises';
const COMPLETED_STORAGE_KEY = 'csharp_completed';
const TEACHER_PIN = import.meta.env.VITE_TEACHER_PIN;
let isAdminMode = false;
let currentSelectedExerciseId = null;

const INITIAL_EXERCISES = {
    "1": {
        condition: "Напишете програма, която извежда 'Здравей, свят!' на конзолата. Използвайте Console.WriteLine().",
        starter_code: "Console.WriteLine(\"Здравей, свят!\");",
        expected_output: "Здравей, свят!",
        hint: "Неактивно.",
        solution_code: "Console.WriteLine(\"Здравей, свят!\");"
    },
    "2": {
        condition: "Напишете програма, която създава две променливи (цели числа), ги събира и извежда резултата. Резултатът (сумата 30) трябва да присъства в изхода.",
        starter_code: "int a = 7;\nint b = 23;\n",
        expected_value_regex: ".*30.*",
        hint: "Неактивно.",
        solution_code: "int a = 7;\nint b = 23;\n\nConsole.WriteLine($\"Сбора на {a} и {b} е: {a + b}\");"
    },
    "3": {
        condition: "Напишете програма, която изчислява лице на правоъгълник със страни 12.5 и 8.4 и извежда резултата. Използвайте тип 'double'. Очакваният резултат е 105.",
        starter_code: "double width = 12.5;\ndouble height = 8.4;\n",
        expected_value_regex: ".*105.*",
        hint: "Неактивно.",
        solution_code: "double width = 12.5;\ndouble height = 8.4;\ndouble area = width * height;\n\nConsole.WriteLine($\"Лицето е: {area}\");"
    }
};

let outputWindow, conditionDiv, exerciseSelect, exerciseListAdmin, runButton, statusDiv;
// ПРОМЯНА: Добавяме adminActions и pinControls
let addExerciseBtn, addExerciseModal, newExerciseForm, pinInputContainer, pinInput, lockBtn, adminControlsContainer, pinControls, adminActions;


function getExercises() {
    const stored = localStorage.getItem(EXERCISES_STORAGE_KEY);
    if (stored) {
        return JSON.parse(stored);
    }
    saveExercises(INITIAL_EXERCISES);
    return INITIAL_EXERCISES;
}

function saveExercises(exercisesObj) {
    localStorage.setItem(EXERCISES_STORAGE_KEY, JSON.stringify(exercisesObj));
}

function getCompletedExercises() {
    const stored = localStorage.getItem(COMPLETED_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

function addCompletedExercise(exerciseId) {
    let completed = getCompletedExercises();
    if (!completed.includes(exerciseId)) {
        completed.push(exerciseId);
        localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(completed));
    }
}


function openModal() {
    if (addExerciseModal) addExerciseModal.style.display = 'flex';
}

function closeModal() {
    if (addExerciseModal) addExerciseModal.style.display = 'none';
    if (newExerciseForm) {
        newExerciseForm.reset();
    }
}


function setAdminMode(enabled) {
    isAdminMode = enabled;

    // Защита: Уверете се, че lockBtn е наличен, преди да продължите
    if (!lockBtn) return;

    if (enabled) {
        // АДМИН РЕЖИМ (ОТКЛЮЧЕН)
        lockBtn.textContent = '🔓';
        lockBtn.onclick = logoutAdmin; 
        
        // ПОКАЗВАМЕ АДМИН КОНТРОЛИТЕ, СКРИВАМЕ ПИН КОНТРОЛИТЕ
        if (pinControls) pinControls.style.display = 'none';
        if (adminActions) {
            adminActions.style.display = 'flex';
            // Добавяме бутона за заключване към админ контролите
            adminActions.appendChild(lockBtn); 
        }
        
        if (addExerciseBtn) addExerciseBtn.style.display = 'inline-block';
        if (exerciseSelect) exerciseSelect.style.display = 'none';
        if (exerciseListAdmin) exerciseListAdmin.style.display = 'block';
        
        if (adminControlsContainer) adminControlsContainer.classList.add('admin-enabled');
        
        // За да не излиза алертът при първо зареждане, го слагаме тук
        if (pinInput && pinInput.value !== '') {
            alert("Успешен достъп! Админ панелът е активиран.");
        }
        
    } else {
        // НОРМАЛЕН РЕЖИМ (ЗАКЛЮЧЕН)
        lockBtn.textContent = '🔒';
        lockBtn.onclick = checkPin; 
        
        // ПОКАЗВАМЕ ПИН КОНТРОЛИТЕ, СКРИВАМЕ АДМИН КОНТРОЛИТЕ
        if (adminActions) adminActions.style.display = 'none';
        if (pinControls) {
            pinControls.style.display = 'flex';
            // Добавяме бутона за отключване обратно към ПИН контролите
            pinControls.appendChild(lockBtn); 
        }
        
        if (addExerciseBtn) addExerciseBtn.style.display = 'none';
        if (pinInput) pinInput.value = '';
        if (exerciseSelect) exerciseSelect.style.display = 'block';
        if (exerciseListAdmin) exerciseListAdmin.style.display = 'none';
        
        if (adminControlsContainer) adminControlsContainer.classList.remove('admin-enabled');
    }

    populateExerciseSelect();

    if (!currentSelectedExerciseId && exerciseSelect && exerciseSelect.options.length > 0) {
        currentSelectedExerciseId = exerciseSelect.options[0].value;
    }
    loadExercise(currentSelectedExerciseId);
}

function checkPin() {
    if (pinInput && pinInput.value === TEACHER_PIN) {
        setAdminMode(true);
    } else {
        alert("Грешен ПИН. Достъпът е отказан.");
        if (pinInput) pinInput.value = '';
    }
}

function logoutAdmin() {
    if (confirm("Сигурни ли сте, че искате да излезете от администраторски режим?")) {
        setAdminMode(false);
        alert("Изход от Админ режим.");
    }
}

function removeExercise(exerciseId) {
    event.stopPropagation();

    const exercisesData = getExercises();
    const exercise = exercisesData[exerciseId];

    if (!confirm(`Сигурни ли сте, че искате да премахнете упражнение: "${exercise.condition.substring(0, 30)}..."?`)) {
        return;
    }

    delete exercisesData[exerciseId];
    saveExercises(exercisesData);

    let completed = getCompletedExercises();
    completed = completed.filter(id => id !== exerciseId);
    localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(completed));

    const remainingIds = Object.keys(getExercises());
    let newSelectedId = null;

    if (currentSelectedExerciseId === exerciseId) {
        if (remainingIds.length > 0) {
            newSelectedId = remainingIds[0];
        }
    } else {
        newSelectedId = currentSelectedExerciseId;
    }

    currentSelectedExerciseId = newSelectedId;

    populateExerciseSelect();
    loadExercise(currentSelectedExerciseId);

    alert("Упражнението беше успешно премахнато!");
}


function populateExerciseSelect() {
    if (!exerciseSelect || !exerciseListAdmin) return;

    const currentExercises = getExercises();
    const completedIds = getCompletedExercises();

    exerciseSelect.innerHTML = '';
    exerciseListAdmin.innerHTML = '';

    let index = 1;
    for (const id in currentExercises) {
        const exercise = currentExercises[id];
        const conditionText = exercise.condition || "Без условие";
        const optionText = `Упражнение ${index}. ${conditionText.substring(0, 60)}${conditionText.length > 60 ? '...' : ''}`;

        const option = document.createElement('option');
        option.value = id;
        option.textContent = optionText;
        if (completedIds.includes(id)) {
            option.classList.add('completed-option');
        }
        exerciseSelect.appendChild(option);

        const adminRow = document.createElement('div');
        adminRow.classList.add('admin-exercise-row');
        adminRow.dataset.id = id;
        if (completedIds.includes(id)) {
            adminRow.classList.add('completed-option');
        }

        if (!currentSelectedExerciseId && index === 1) {
            currentSelectedExerciseId = id;
        }

        if (id === currentSelectedExerciseId) {
            adminRow.classList.add('selected');
        }

        adminRow.innerHTML = `
            <span>${optionText}</span>
            <button class="remove-exercise-btn" onclick="removeExercise('${id}')" title="Премахни упражнение">❌</button>
        `;
        adminRow.onclick = () => {
            currentSelectedExerciseId = id;
            loadExercise(id);
        };
        exerciseListAdmin.appendChild(adminRow);

        index++;
    }

    if (isAdminMode) {
        exerciseSelect.style.display = 'none';
        exerciseListAdmin.style.display = 'block';
    } else {
        exerciseSelect.style.display = 'block';
        exerciseListAdmin.style.display = 'none';
    }

    if (exerciseSelect && currentSelectedExerciseId) {
        exerciseSelect.value = currentSelectedExerciseId;
    }
}


function handleNewExercise(event) {
    event.preventDefault();

    const condition = document.getElementById('new-condition').value.trim();
    const starterCode = document.getElementById('new-starter-code').value;
    const expectedOutput = document.getElementById('new-expected-output').value.trim();
    const solutionCode = document.getElementById('new-solution-code').value;

    const hint = "Подсказката е деактивирана за този режим.";

    if (!condition || !expectedOutput) {
        alert("Моля, попълнете Условието и Очаквания Изход.");
        return;
    }

    const currentExercises = getExercises();
    const newId = Date.now().toString();

    let exerciseData = {
        condition: condition,
        starter_code: starterCode || "// Вашият код тук",
        hint: hint,
        solution_code: solutionCode || starterCode,
    };

    if (expectedOutput.startsWith('/') && expectedOutput.endsWith('/')) {
        exerciseData.expected_value_regex = expectedOutput.slice(1, -1);
    } else {
        exerciseData.expected_output = expectedOutput;
    }

    currentExercises[newId] = exerciseData;

    saveExercises(currentExercises);

    currentSelectedExerciseId = newId;

    populateExerciseSelect();
    if (exerciseSelect) exerciseSelect.value = newId;

    loadExercise(newId);

    closeModal();
    alert(`Упражнение е успешно добавено и запазено!`);
}


function initializeMonaco() {
    require.config({
        paths: {
            'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs'
        }
    });

    require(['vs/editor/editor.main', 'vs/basic-languages/csharp/csharp'], function () {

        const csharpLib = `
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

public static class Console {
    public static void WriteLine(object value);
    public static void WriteLine(string format, params object[] arg);
    public static void Write(object value);
}
public class List<T> {}
public class String {}
        `;

        if (monaco.languages.csharp && monaco.languages.csharp.typescriptDefaults) {
            monaco.languages.csharp.typescriptDefaults.addExtraLib(csharpLib, 'filename/csharp.d.ts');
            monaco.languages.csharp.typescriptDefaults.setCompilerOptions({
                allowNonTsExtensions: true,
                noLib: true
            });
        }

        codeEditorInstance = monaco.editor.create(document.getElementById('code-editor-container'), {
            value: "// Зареждане на C# код...",
            language: 'csharp',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: true },
            fontSize: 16,
            scrollBeyondLastLine: false,
            mouseWheelZoom: false,
        });

        // Първоначално зареждане на упражнение
        if (exerciseSelect && exerciseSelect.value) {
            currentSelectedExerciseId = exerciseSelect.value;
            loadExercise(currentSelectedExerciseId);
        }
    });
}


function parseCompilerErrors(rawOutput) {
    const errorRegex = /\((\d+),(\d+)\): (error|warning) ([A-Z0-9]+): (.*)/g;
    const markers = [];
    let match;

    if (typeof monaco === 'undefined' || !monaco.MarkerSeverity) return markers;

    while ((match = errorRegex.exec(rawOutput)) !== null) {
        const lineNumber = parseInt(match[1]);
        const columnNumber = parseInt(match[2]);
        const severity = match[3] === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning;
        const code = match[4];
        const message = match[5];

        markers.push({
            startLineNumber: lineNumber,
            startColumn: columnNumber,
            endLineNumber: lineNumber,
            endColumn: columnNumber + 100,
            message: `${code}: ${message}`,
            severity: severity
        });
    }
    return markers;
}

function handleFailure(output, customMessage) {
    if (statusDiv) statusDiv.innerHTML = '❌ <span class="text-red-600 font-bold">НЕУСПЕХ.</span>';

    if (codeEditorInstance && codeEditorInstance.getModel() && typeof monaco !== 'undefined' && monaco.editor.getModelMarkers(codeEditorInstance.getModel(), 'compiler').length > 0) {
        if (outputWindow) outputWindow.value = `*** ГРЕШКА В КОДА 🛑 ***\nВижте червените линии и отбелязването вдясно в редактора.`;
    } else {
        if (outputWindow) outputWindow.value = `*** ${customMessage} ⚠️ ***\n\n${output}`;
    }
}


function loadExercise(id = currentSelectedExerciseId) {
    if (!id) {
        if (conditionDiv) conditionDiv.innerHTML = "<p class='text-red-500'>Няма налични упражнения.</p>";
        if (codeEditorInstance) {
            codeEditorInstance.setValue("// Няма упражнения");
        }
        return;
    }

    currentSelectedExerciseId = id;
    const exercisesData = getExercises();
    const exercise = exercisesData[id];

    if (exercise) {
        if (!isAdminMode && exerciseSelect) {
            exerciseSelect.value = id;
        } else if (isAdminMode) {
            document.querySelectorAll('.admin-exercise-row').forEach(row => {
                row.classList.remove('selected');
                if (row.dataset.id === id) {
                    row.classList.add('selected');
                }
            });
        }

        if (conditionDiv) {
            conditionDiv.innerHTML = `<p class="font-medium text-lg text-indigo-700 mb-2">Условие:</p><p class="text-gray-700">${exercise.condition}</p>`;
        }

        if (codeEditorInstance) {
            codeEditorInstance.setValue(exercise.starter_code);
            if (codeEditorInstance.getModel()) {
                monaco.editor.setModelMarkers(codeEditorInstance.getModel(), 'compiler', []);
            }
        }

        if (outputWindow) outputWindow.value = `Упражнение е заредено. Готови за компилация.`;

    } else {
        if (conditionDiv) conditionDiv.innerHTML = "<p class='text-red-500'>Упражнението не е намерено.</p>";
        if (codeEditorInstance) {
            codeEditorInstance.setValue("// Грешка при зареждане");
        }
    }
}

async function runCode() {
    if (!codeEditorInstance || !currentSelectedExerciseId) {
        if (outputWindow) outputWindow.value = "Няма избрано упражнение или редакторът не е зареден.";
        return;
    }

    const userCode = codeEditorInstance.getValue();

    if (codeEditorInstance.getModel()) {
        monaco.editor.setModelMarkers(codeEditorInstance.getModel(), 'compiler', []);
    }

    if (runButton) {
        runButton.disabled = true;
        runButton.innerHTML = `<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Компилиране...`;
    }
    if (outputWindow) outputWindow.value = "Компилиране и изпълнение... Моля, изчакайте...";

    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: userCode, input: '' })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP Грешка: ${response.status} ${response.statusText}. Детайли: ${errorText}`);
        }

        const data = await response.json();
        const exercisesData = getExercises();
        const currentExercise = exercisesData[currentSelectedExerciseId];

        if (data.isSuccess) {
            const trimmedOutput = data.output ? data.output.trim() : "";
            let isSuccessful = false;

            if (currentExercise.expected_value_regex) {
                try {
                    const regex = new RegExp(currentExercise.expected_value_regex, 'm');
                    isSuccessful = regex.test(trimmedOutput);
                } catch (e) {
                    isSuccessful = false;
                    console.error("Грешка при изпълнение на Regex за проверка:", e);
                }
            } else if (currentExercise.expected_output) {
                isSuccessful = trimmedOutput === currentExercise.expected_output.trim();
            }

            if (isSuccessful) {
                if (statusDiv) statusDiv.innerHTML = '✅ <span class="text-green-600 font-bold">УПРАЖНЕНИЕТО Е ИЗПЪЛНЕНО!</span>';
                if (outputWindow) outputWindow.value = `*** УСПЕХ! 🎉 ***\n\n${data.output}`;

                markExerciseAsCompleted(currentSelectedExerciseId);


            } else {
                handleFailure(data.output, "Неправилен изход. Проверете дали очакваната стойност е налична в конзолата.");
            }
        } else {
            const errors = parseCompilerErrors(data.output);
            if (errors.length > 0) {
                if (codeEditorInstance.getModel()) {
                    monaco.editor.setModelMarkers(codeEditorInstance.getModel(), 'compiler', errors);
                }
                handleFailure(data.output, `Грешка при компилация.`);
            } else {
                handleFailure(data.output, `Възникна грешка при изпълнение на кода.`);
            }
        }

    } catch (error) {
        console.error('Fetch Error:', error);
        if (outputWindow) outputWindow.value = `Неуспешно свързване със сървъра! Проверете дали C# API е стартиран на http://localhost:5170.\n\nГрешка: ${error.message}`;
    } finally {
        if (runButton) {
            runButton.disabled = false;
            runButton.innerHTML = '▶️ Изпълни Кода';
        }
    }
}


function markExerciseAsCompleted(id) {
    if (exerciseSelect) {
        const selectedOption = exerciseSelect.querySelector(`option[value="${id}"]`);
        if (selectedOption) {
            selectedOption.classList.add('completed-option');
        }
    }

    const adminRow = document.querySelector(`.admin-exercise-row[data-id="${id}"]`);
    if (adminRow) {
        adminRow.classList.add('completed-option');
    }

    addCompletedExercise(id);

    console.log(`Упражнение ${id} беше успешно маркирано като завършено!`);
}


document.addEventListener('DOMContentLoaded', () => {

    outputWindow = document.getElementById('output-window');
    conditionDiv = document.getElementById('exercise-condition');
    exerciseSelect = document.getElementById('exercise-select');
    exerciseListAdmin = document.getElementById('exercise-list-admin');
    runButton = document.getElementById('run-button');
    statusDiv = document.getElementById('exercise-status');

    addExerciseBtn = document.getElementById('add-exercise-btn');
    addExerciseModal = document.getElementById('add-exercise-modal');
    newExerciseForm = document.getElementById('new-exercise-form');
    
    // ПРОМЯНА: Инициализация на новите/преименуваните елементи
    pinControls = document.getElementById('pin-controls');
    adminActions = document.getElementById('admin-actions');
    pinInputContainer = pinControls; // Използваме pinControls като контейнер за пин
    
    pinInput = document.getElementById('pin-input');
    lockBtn = document.getElementById('lock-btn');
    adminControlsContainer = document.getElementById('admin-controls'); 

    populateExerciseSelect();

    initializeMonaco();

    if (exerciseSelect) {
        exerciseSelect.addEventListener('change', (e) => loadExercise(e.target.value));
    }

    if (addExerciseBtn) {
        addExerciseBtn.addEventListener('click', openModal);
    }
    if (newExerciseForm) {
        newExerciseForm.addEventListener('submit', handleNewExercise);
    }

    if (pinInput) {
        pinInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                checkPin();
            }
        });
    }
    
    // Инициализация на lockBtn и режима
    if (lockBtn) {
        // Първоначалното състояние (заключен)
        lockBtn.onclick = checkPin;
    }
    setAdminMode(isAdminMode);


    window.closeModal = closeModal;
    window.loadExercise = loadExercise;
    window.runCode = runCode;
    window.checkPin = checkPin;
    window.logoutAdmin = logoutAdmin;
    window.removeExercise = removeExercise;
    window.markExerciseAsCompleted = markExerciseAsCompleted;
});