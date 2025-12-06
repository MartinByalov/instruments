const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// --- Състояние на Приложението ---
let padletState = {
    questions: [],
    isLocked: false,
    isAnsweringEnabled: false,
    countdownEndTime: null
};

let timerTimeout = null;

// -------------------- Конфигурация на Статични Файлове --------------------

// Обслужване на текущата директория (за dashboard.css, index.html)
app.use(express.static(__dirname));

// Обслужване на tools директорията
app.use('/tools', express.static(path.join(__dirname, 'tools')));

// Socket.IO клиентски скрипт
app.get('/socket.io.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'node_modules', 'socket.io', 'client-dist', 'socket.io.js'));
});

// Monaco Editor (за /compiler)
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// Favicon (за да няма грешки)
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// -------------------- Основни Маршрути --------------------

// Главна страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Padlet за Учител
app.get('/padlet', (req, res) => {
    res.sendFile(path.join(__dirname, 'tools', 'padlet', 'padlet-teacher.html'));
});

// Padlet за Ученик
app.get('/student', (req, res) => {
    res.sendFile(path.join(__dirname, 'tools', 'padlet', 'padlet-student.html'));
});

// Страница за Състояния
app.get('/control', (req, res) => {
    res.sendFile(path.join(__dirname, 'tools', 'control', 'control.html'));
});

// Страница за Таймера
app.get('/planner', (req, res) => {
    res.sendFile(path.join(__dirname, 'tools', 'planner', 'planner.html'));
});

// Компилатор
app.get('/compiler', (req, res) => {
    res.sendFile(path.join(__dirname, 'tools', 'compiler', 'compiler.html'));
});

// -------------------- Socket.IO Логика --------------------

function stopTimer() {
    clearTimeout(timerTimeout);
    timerTimeout = null;
    
    padletState.countdownEndTime = null;
    padletState.isLocked = false;
    padletState.isAnsweringEnabled = false;

    io.emit('sessionStatusUpdate', { 
        isLocked: padletState.isLocked, 
        isAnsweringEnabled: padletState.isAnsweringEnabled 
    });
    
    io.emit('timerUpdate', { endTime: null });
    console.log('Таймер спрян. Сесията е приключена.');
}

io.on('connection', (socket) => {
    console.log('Нов потребител свързан:', socket.id);

    socket.emit('initialData', padletState);

    // 1. Учител: Актуализация на въпросите
    socket.on('updateData', (data) => {
        padletState.questions = data.questions;
        io.emit('dataUpdated', { questions: padletState.questions });
        console.log(`Данните обновени. Въпроси: ${padletState.questions.length}`);
    });

    // 2. Учител: Стартиране на нов Padlet
    socket.on('startNewPadlet', () => {
        stopTimer();
        
        padletState = {
            questions: [],
            isLocked: false,
            isAnsweringEnabled: false,
            countdownEndTime: null
        };
        io.emit('initialData', padletState);
        console.log('Нов Padlet стартиран. Състоянието е изчистено.');
    });

    // 3. Учител: Управление на Таймер
    socket.on('startTimer', (data) => {
        const newEndTime = data.endTime;
        
        if (newEndTime === null) {
            stopTimer();
            return;
        }
        
        if (timerTimeout) {
            clearTimeout(timerTimeout);
            timerTimeout = null;
        }

        padletState.countdownEndTime = newEndTime;
        padletState.isLocked = true;
        padletState.isAnsweringEnabled = true;
        
        io.emit('sessionStatusUpdate', { 
            isLocked: padletState.isLocked, 
            isAnsweringEnabled: padletState.isAnsweringEnabled 
        });
        
        io.emit('timerUpdate', { endTime: padletState.countdownEndTime });
        console.log(`Таймер стартиран до: ${new Date(newEndTime)}`);

        const duration = newEndTime - Date.now();
        if (duration > 0) {
            timerTimeout = setTimeout(() => {
                if (padletState.countdownEndTime === newEndTime) {
                    stopTimer();
                }
            }, duration);
        }
    });

    // 4. Ученик: Изпращане на отговор
    socket.on('submitAnswer', (data) => {
        if (padletState.isAnsweringEnabled) {
            const question = padletState.questions.find(q => q.id === data.questionId);
            if (question) {
                const existingAnswerIndex = question.answers.findIndex(a => a.studentName === data.answer.studentName);

                if (existingAnswerIndex !== -1) {
                    question.answers[existingAnswerIndex] = data.answer;
                    console.log(`Отговорът на ${data.answer.studentName} за въпрос ${data.questionId} е обновен.`);
                } else {
                    question.answers.push(data.answer);
                    console.log(`Нов отговор от ${data.answer.studentName} за въпрос ${data.questionId}.`);
                }
                
                io.emit('dataUpdated', { questions: padletState.questions });
            }
        }
    });
    
    socket.on('disconnect', () => {
        console.log('Потребител изключен:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`✅ Сървърът работи на: http://localhost:${PORT}`);
    console.log(`├─ Главна страница: http://localhost:${PORT}/`);
    console.log(`├─ Padlet Учител: http://localhost:${PORT}/padlet`);
    console.log(`├─ Padlet Ученик: http://localhost:${PORT}/student`);
    console.log(`├─ Контролен панел: http://localhost:${PORT}/control`);
    console.log(`├─ Таймер: http://localhost:${PORT}/planner`);
    console.log(`└─ Компилатор: http://localhost:${PORT}/compiler`);
});