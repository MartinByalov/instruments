// server.js (Пълен код)
require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const axios = require('axios');

const TEACHER_PIN_SERVER = process.env.VITE_TEACHER_PIN;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const API_URL = process.env.API_URL || "http://localhost:5170";
fetch(`${API_URL}/some-endpoint`)


let padletState = {
    questions: [],
    isLocked: false,
    isAnsweringEnabled: false,
    countdownEndTime: null
};

let timerTimeout = null;

app.use(express.json());

// Основно статично съдържание
app.use(express.static(__dirname));

app.use('/tools', express.static(path.join(__dirname, 'tools')));

app.get('/socket.io.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'node_modules', 'socket.io', 'client-dist', 'socket.io.js'));
});

app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/padlet', (req, res) => {
    res.sendFile(path.join(__dirname, 'tools', 'padlet', 'padlet-teacher.html'));
});

app.get('/student', (req, res) => {
    res.sendFile(path.join(__dirname, 'tools', 'padlet', 'padlet-student.html'));
});

app.get('/control', (req, res) => {
    res.sendFile(path.join(__dirname, 'tools', 'control', 'control.html'));
});

app.get('/planner', (req, res) => {
    res.sendFile(path.join(__dirname, 'tools', 'planner', 'planner.html'));
});

// КОРЕКЦИЯ ТУК: Четем compiler.html, инжектираме PIN и го връщаме
app.get('/compiler', async (req, res) => {
    const htmlPath = path.join(__dirname, 'tools', 'compiler', 'Frontend', 'compiler.html');
    try {
        let htmlContent = await require('fs').promises.readFile(htmlPath, 'utf8');

        // Инжектираме PIN кода като глобална JS променлива
        const pinScript = `<script>window.TEACHER_PIN_GLOBAL = "${TEACHER_PIN_SERVER}";</script>`;
        
        // Вмъкваме скрипта преди затварящия таг </head>
        htmlContent = htmlContent.replace('</head>', `${pinScript}</head>`);
        
        res.send(htmlContent);
    } catch (err) {
        console.error("Error loading compiler.html:", err);
        res.status(500).send("Грешка при зареждане на компилаторския интерфейс.");
    }
});
// Трябва да добавите 'fs' в server.js: const fs = require('fs');

app.post('/api/run-code', async (req, res) => {

    const targetUrl = `${CSHARP_API_URL}/run-code`;

    const requestData = req.body;

    try {
        const response = await axios.post(targetUrl, requestData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        res.status(response.status).json(response.data);

    } catch (error) {
        console.error('--- Axios Proxy Error ---');
        if (error.response) {
            console.error(`C# API Status: ${error.response.status}`);
            console.error(`C# API Data:`, error.response.data);

            res.status(error.response.status).json(error.response.data);

        } else {
            console.error('Network or Connection Error:', error.message);
            res.status(503).json({
                isSuccess: false,
                output: `Грешка при свързване с C# API (${CSHARP_API_URL}). Проверете дали C# сървърът работи.`
            });
        }
    }
});


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

    socket.on('updateData', (data) => {
        padletState.questions = data.questions;
        io.emit('dataUpdated', { questions: padletState.questions });
        console.log(`Данните обновени. Въпроси: ${padletState.questions.length}`);
    });

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
    console.log(`├─ Компилатор: http://localhost:${PORT}/compiler`);
    console.log(`└─ C# API Target: https://instruments-0z1g.onrender.com`);
});