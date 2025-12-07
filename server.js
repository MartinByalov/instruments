// server.js (Коригиран код за Render)

// Използваме dotenv, за да заредим .env променливите ЛОКАЛНО
// Render използва собствените си Environment Variables
require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const axios = require('axios');
const fs = require('fs'); // Трябва да е добавен, за да работи require('fs').promises.readFile

const TEACHER_PIN_SERVER = process.env.VITE_TEACHER_PIN;

// 1. ✅ Корекция на PORT: Чете от средата (Render)
const PORT = process.env.PORT || 3000; 

// 2. ✅ Дефинираме CSHARP_API_URL: Чете от средата (Render)
const CSHARP_API_URL = process.env.CSHARP_API_URL || "http://localhost:5170"; 
 
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Може да премахнете този fetch, тъй като Render може да го интерпретира като неуспешен health check
// fetch(`${CSHARP_API_URL}/some-endpoint`)


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
        let htmlContent = await fs.promises.readFile(htmlPath, 'utf8'); // Използваме fs.promises

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


app.post('/api/run-code', async (req, res) => {

    // Използваме дефинирания CSHARP_API_URL от ENV
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
// ... (останалата част от функциите)
}

io.on('connection', (socket) => {
// ... (останалата част от логиката на Socket.io)
});


server.listen(PORT, () => {
    console.log(`✅ Сървърът работи на: http://localhost:${PORT}`);
    console.log(`├─ Главна страница: http://localhost:${PORT}/`);
    console.log(`├─ Padlet Учител: http://localhost:${PORT}/padlet`);
    console.log(`├─ Padlet Ученик: http://localhost:${PORT}/student`);
    console.log(`├─ Контролен панел: http://localhost:${PORT}/control`);
    console.log(`├─ Таймер: http://localhost:${PORT}/planner`);
    console.log(`├─ Компилатор: http://localhost:${PORT}/compiler`);
    // ✅ Използваме CSHARP_API_URL за логване на адреса
    console.log(`└─ C# API Target: ${CSHARP_API_URL}`); 
});