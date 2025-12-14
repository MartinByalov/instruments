// compiler.js
const API_BASE_URL = '/api/run-code';
// Четем URL от глобална променлива, инжектирана от сървъра (сигурно)
const CSHARP_API_URL = window.CSHARP_API_URL_GLOBAL; 

let codeEditorInstance;
const EXERCISES_STORAGE_KEY = 'csharp_exercises';
const COMPLETED_STORAGE_KEY = 'csharp_completed';
// TEACHER_PIN вече не е нужен тук, проверката се прави на сървъра
let isAdminMode = false;
let currentSelectedExerciseId = null;

const INITIAL_EXERCISES = {
    // =================================================================
    // 1. ТЕМА 20: Намиране на Минимум и Максимум
    // =================================================================
    "1": {
        condition: "Намерете по-голямото число между 15 и 7, съхранете резултата в променливата maxNum и го изведете. Трябва да използвате променливите a и b, както и Math.Max().",
        starter_code: "int a = 15;\nint b = 7;\nint maxNum = Math.Max( /* ТУК ДОПИШИ ИЗРАЗА */ );\nConsole.WriteLine(maxNum);",
        expected_output: "15",
        hint: "Използвайте a и b като аргументи на Math.Max().",
        solution_code: "int a = 15;\nint b = 7;\nint maxNum = Math.Max(a, b);\nConsole.WriteLine(maxNum);"
    },
    // =================================================================
    // 2. ТЕМА 21: Търсене и Преброяване (Масиви)
    // =================================================================
    "2": {
        condition: "Използвайте for цикъл, за да преброите колко пъти числото '5' се среща в масива 'numbers'. Допишете целият for цикъл. Изведете брояча (count).",
        starter_code: "int[] numbers = { 2, 5, 8, 5, 1, 5 };\nint count = 0;\n\n/* ТУК ДОПИШИ ЦЕЛИЯ FOR ЦИКЪЛ */\n{\n    if (numbers[i] == 5)\n    {\n        count++;\n    }\n}\nConsole.WriteLine(count);",
        expected_output: "3",
        hint: "Цикълът трябва да обхожда от i=0 до numbers.Length - 1.",
        solution_code: "int[] numbers = { 2, 5, 8, 5, 1, 5 };\nint count = 0;\n\nfor (int i = 0; i < numbers.Length; i++)\n{\n    if (numbers[i] == 5)\n    {\n        count++;\n    }\n}\nConsole.WriteLine(count);"
    },
    // =================================================================
    // 3. ТЕМА 22: Двумерни Масиви – Дефиниране и Достъп
    // =================================================================
    // =================================================================
    // 4. ТЕМА 23: Методи – Дефиниране и Извикване
    // =================================================================
    "3": {
        condition: "Допишете пълната дефиниция на метод на име 'PrintInfo', който не връща стойност и извежда 'Аз съм метод.'. След това го извикайте.",
        starter_code: "/* ТУК ДОПИШИ ЦЯЛАТА ДЕФИНИЦИЯ НА МЕТОДА */\n{\n    Console.WriteLine(\"Аз съм метод.\");\n}\nPrintInfo();",
        expected_output: "Аз съм метод.",
        hint: "Дефиницията трябва да започва с 'public static void...'",
        solution_code: "public static void PrintInfo()\n{\n    Console.WriteLine(\"Аз съм метод.\");\n}\nPrintInfo();"
    },
    // =================================================================
    // 5. ТЕМА 24: Методи – Упражнение (Тяло)
    // =================================================================
    "4": {
        condition: "Допишете тялото на метода 'CalculateSum', за да изчислите и изведете сбора на числата 5 и 8.",
        starter_code: "public static void CalculateSum()\n{\n    /* ТУК ДОПИШИ ЛОГИКАТА ЗА СБОРА И ИЗВЕЖДАНЕТО */\n}\nCalculateSum();",
        expected_output: "13",
        hint: "Изчислете int sum = 5 + 8; и го изведете.",
        solution_code: "public static void CalculateSum()\n{\n    int sum = 5 + 8;\n    Console.WriteLine(sum);\n}\nCalculateSum();"
    },
    // =================================================================
    // 6. ТЕМА 25: Използване на Параметри и Аргументи
    // =================================================================
    "5": {
        condition: "Променете дефиницията на метода 'Greeting', за да приеме параметър 'string name'. След това изведете персонализирано съобщение: 'Здравей, [подаденото име]!'",
        starter_code: "public static void Greeting( /* ТУК ДОПИШИ ПАРАМЕТЪРА */ )\n{\n    Console.WriteLine(\"Здравей, \" + /* ТУК ДОПИШИ ПРОМЕНЛИВАТА */ + \"!\");\n}\n\nGreeting(\"Иван\");",
        expected_output: "Здравей, Иван!",
        hint: "Използвайте 'string name' в дефиницията и 'name' в тялото.",
        solution_code: "public static void Greeting(string name)\n{\n    Console.WriteLine(\"Здравей, \" + name + \"!\");\n}\n\nGreeting(\"Иван\");"
    },
    // =================================================================
    // 7. ТЕМА 26: Връщане на Стойности от Функции
    // =================================================================
    "6": {
        condition: "Допишете метода 'Multiply', за да приема два 'int' параметъра ('a' и 'b'), и да връща като резултат тяхното произведение. Използвайте return.",
        starter_code: "public static int Multiply( /* ТУК ДОПИШИ ПАРАМЕТРИТЕ */ )\n{\n    /* ТУК ДОПИШИ RETURN ИЗРАЗА */\n}\nConsole.WriteLine(Multiply(6, 7));",
        expected_output: "42",
        hint: "Параметрите са int a, int b. Решението е return a * b;",
        solution_code: "public static int Multiply(int a, int b)\n{\n    return a * b;\n}\nConsole.WriteLine(Multiply(6, 7));"
    },
};

let outputWindow, conditionDiv, exerciseSelect, exerciseListAdmin, runButton, statusDiv;
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

    if (!lockBtn || !pinInput || !adminActions) return;

    if (enabled) {
        // АДМИН РЕЖИМ (ОТКЛЮЧЕН)
        lockBtn.textContent = '🔓'; 
        lockBtn.onclick = logoutAdmin;
        
        // СКРИВАМЕ полето за въвеждане на ПИН
        pinInput.style.display = 'none'; 
        
        // ПОКАЗВАМЕ АДМИН КОНТРОЛИТЕ
        adminActions.style.display = 'flex';
        if (adminControlsContainer) adminControlsContainer.classList.add('admin-enabled');
        
        // Съобщението за успех вече е в checkPin()
        
    } else {
        // НОРМАЛЕН РЕЖИМ (ЗАКЛЮЧЕН)
        lockBtn.textContent = '🔒'; 
        lockBtn.onclick = checkPin;
        
        // ПОКАЗВАМЕ полето за въвеждане на ПИН
        pinInput.style.display = 'block'; 
        
        // СКРИВАМЕ АДМИН КОНТРОЛИТЕ
        adminActions.style.display = 'none';
        if (adminControlsContainer) adminControlsContainer.classList.remove('admin-enabled');
        
        if (pinInput) pinInput.value = '';
        if (addExerciseBtn) addExerciseBtn.style.display = 'none';
    }

    // Превключване на изгледа за избор на упражнения
    if (exerciseSelect) exerciseSelect.style.display = enabled ? 'none' : 'block';
    if (exerciseListAdmin) exerciseListAdmin.style.display = enabled ? 'block' : 'none';

    populateExerciseSelect();

    if (!currentSelectedExerciseId && exerciseSelect && exerciseSelect.options.length > 0) {
        currentSelectedExerciseId = exerciseSelect.options[0].value;
    }
    loadExercise(currentSelectedExerciseId);
}

// ** АКТУАЛИЗИРАНА ФУНКЦИЯ ЗА СИГУРНА ПРОВЕРКА НА ПИН **
async function checkPin() {
    if (!pinInput) return;

    const pin = pinInput.value;
    
    if (pin.length === 0) {
        alert("Въведете ПИН.");
        return;
    }

    try {
        // Изпращаме PIN-а към сървърния ендпойнт за проверка
        const response = await fetch('/api/check-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: pin })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            setAdminMode(true);
            alert("Успешен достъп! Админ панелът е активиран.");
        } else {
            alert(data.message || "Грешен ПИН. Достъпът е отказан.");
            pinInput.value = '';
        }
    } catch (error) {
        console.error('Грешка при проверка на ПИН:', error);
        alert('Неуспешна комуникация със сървъра за проверка на ПИН.');
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
        // Използваме CSHARP_API_URL, зареден от глобалната променлива
        if (outputWindow) outputWindow.value = `Неуспешно свързване със сървъра! Проверете дали C# API е стартиран на ${CSHARP_API_URL}.\n\nГрешка: ${error.message}`;
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


/**
 * Изпраща GET заявка към C# API, за да го събуди
 * ако е в 'спящ' режим (cold start). 
 */
async function wakeUpCompilerAPI() {
    // Използваме CSHARP_API_URL, който е зареден от глобалната променлива
    if (!CSHARP_API_URL) return;

    console.log(`Изпращане на заявка до ${CSHARP_API_URL} за събуждане...`);

    try {
        // Изпращаме проста GET заявка към базовия URL. 
        const response = await fetch(CSHARP_API_URL, {
            method: 'GET',
            mode: 'no-cors' 
        });

        // Тъй като използваме no-cors, не можем да проверим response.ok, 
        // но заявката вече е изпратена.
        console.log("Заявката за събуждане е изпратена успешно.");

    } catch (error) {
        // Грешката при no-cors заявка често е Network Error,
        // но целта е постигната - сървърът е събуден.
        console.warn("Внимание: Възможност за грешка при събуждане (но заявката беше изпратена).", error.message);
    }
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
    
    // Инициализация на елементите
    adminActions = document.getElementById('admin-actions');
    pinInput = document.getElementById('pin-input');
    lockBtn = document.getElementById('lock-btn');
    adminControlsContainer = document.getElementById('admin-controls');

    populateExerciseSelect();

    initializeMonaco();

    // ******************************************************
    // ИЗВИКВАНЕ НА ФУНКЦИЯТА ЗА СЪБУЖДАНЕ ПРИ ЗАРЕЖДАНЕ
    // ******************************************************
    wakeUpCompilerAPI();

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
    
    // Първоначалното състояние (заключен)
    if (lockBtn) {
        lockBtn.onclick = checkPin;
    }
    
    setAdminMode(false); 


    window.closeModal = closeModal;
    window.loadExercise = loadExercise;
    window.runCode = runCode;
    window.checkPin = checkPin;
    window.logoutAdmin = logoutAdmin;
    window.removeExercise = removeExercise;
    window.markExerciseAsCompleted = markExerciseAsCompleted;
});