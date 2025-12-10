// server.js (ФИНАЛНА ВЕРСИЯ: Session Cookie Auth)

require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const axios = require('axios');
const fs = require('fs');
const cookieParser = require('cookie-parser'); // ✅ 1. ДОБАВЕНО: cookie-parser

const TEACHER_PIN_SERVER = process.env.TEACHER_PIN;

// 🚨 ДИАГНОСТИЧЕН ЛОГ
console.log('--- СЪРВЪРЕН PIN ЗА ДИАГНОСТИКА: ---', TEACHER_PIN_SERVER);

const PORT = process.env.PORT || 3000;
const CSHARP_API_URL = process.env.CSHARP_API_URL || "http://localhost:5170";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// =================================================================
// Глобално състояние
// =================================================================
let padletState = {
    questions: [],
    isLocked: false,
    isAnsweringEnabled: false,
    countdownEndTime: null
};

let timerTimeout = null;

app.use(express.json());
app.use(cookieParser()); // ✅ 2. ДОБАВЕНО: Използване на cookie-parser

// =================================================================
// ✅ КОРЕКЦИЯ: Middleware за проверка на Cookie
// =================================================================
function requirePin(req, res, next) {
    if (!TEACHER_PIN_SERVER || TEACHER_PIN_SERVER.trim() === "") {
        // Няма PIN → няма защита (позволяваме достъп)
        return next();
    }

    // 🚨 НОВА ПРОВЕРКА: Проверяваме дали Cookie 'is_teacher' е зададен
    if (req.cookies.is_teacher === 'true') {
        return next(); // Валиден Cookie → пропускаме
    }

    // ❌ Няма валиден Cookie → връщаме грешка
    return res.status(403).send(`
        <h2 style="font-family:sans-serif;color:#b00;text-align:center;margin-top:40px;">
            🔒 Тази страница е заключена.<br>
            Трябва да влезете през главното меню.
        </h2>
    `);
}
// =================================================================


// =================================================================
// API РУТА: Аутентикация на PIN (Нова рута)
// =================================================================
app.post('/api/auth/pin-login', (req, res) => {
    const { pin } = req.body;
    
    // Ако няма конфигуриран PIN на сървъра, се счита за отключено
    if (!TEACHER_PIN_SERVER || TEACHER_PIN_SERVER.trim() === "") {
        // Задаваме cookie, за да отключим останалите рути
        res.cookie('is_teacher', 'true', { maxAge: 900000, httpOnly: true, secure: process.env.NODE_ENV === 'production' });
        return res.json({ success: true, message: "Отключено по подразбиране." });
    }

    // Валидация спрямо сървърния PIN
    if (pin === TEACHER_PIN_SERVER) {
        // ✅ Верен PIN: Задаваме Cookie за 15 минути (900000 ms)
        // httpOnly: Cookie-то не може да се достъпва от client-side JS (повишена сигурност)
        // secure: Препоръчва се за production (изисква HTTPS)
        res.cookie('is_teacher', 'true', { maxAge: 900000, httpOnly: true, secure: process.env.NODE_ENV === 'production' });
        return res.json({ success: true, message: "Успешна аутентикация." });
    } else {
        // ❌ Грешен PIN
        return res.status(401).json({ success: false, message: "Грешен PIN." });
    }
});
// =================================================================


// =================================================================
// ✅ ПЪРВО: Динамична роута за главната страница (/)
// =================================================================
app.get('/', async (req, res) => {
    const htmlPath = path.join(__dirname, 'index.html');

    try {
        let htmlContent = await fs.promises.readFile(htmlPath, 'utf8');

        // Pin-ът вече не е нужен за Frontend валидация, но го запазваме за диагностика
        // Ако го премахнете, трябва да премахнете и логиката за '🔓 Отключено по подразбиране' от dashboard.js
        const pinScript = `<script>window.TEACHER_PIN_GLOBAL = "${TEACHER_PIN_SERVER}";</script>`;
        htmlContent = htmlContent.replace(/<\/head>/i, `${pinScript}</head>`);

        res.send(htmlContent);

    } catch (err) {
        console.error("Error loading index.html:", err);
        res.status(500).send("Грешка при зареждане на главната страница.");
    }
});


// =================================================================
// 📌 ТУК СЛАГАМЕ express.static — след /
// =================================================================
app.use(express.static(__dirname));
app.use('/tools', express.static(path.join(__dirname, 'tools')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));


// =================================================================
// Подстраници (Всички са защитени с requirePin)
// =================================================================
app.get('/padlet', requirePin, (req, res) => { // ✅ ЗАЩИТЕНО
    res.sendFile(path.join(__dirname, 'tools', 'padlet', 'padlet-teacher.html'));
});

// app.get('/student', ...) - Не се нуждае от requirePin
app.get('/student', (req, res) => {
    res.sendFile(path.join(__dirname, 'tools', 'padlet', 'padlet-student.html'));
});

app.get('/control', requirePin, (req, res) => { // ✅ ЗАЩИТЕНО
    res.sendFile(path.join(__dirname, 'tools', 'control', 'control.html'));
});

app.get('/planner', requirePin, (req, res) => { // ✅ ЗАЩИТЕНО
    res.sendFile(path.join(__dirname, 'tools', 'planner', 'planner.html'));
});


// =================================================================
// ✅ Динамично инжектиране на PIN в compiler.html (Защитено)
// =================================================================
app.get('/compiler', requirePin, async (req, res) => { // ✅ ЗАЩИТЕНО
    const htmlPath = path.join(__dirname, 'tools', 'compiler', 'Frontend', 'compiler.html');

    try {
        let htmlContent = await fs.promises.readFile(htmlPath, 'utf8');

        const pinScript = `<script>window.TEACHER_PIN_GLOBAL = "${TEACHER_PIN_SERVER}";</script>`;
        htmlContent = htmlContent.replace(/<\/head>/i, `${pinScript}</head>`);

        res.send(htmlContent);

    } catch (err) {
        console.error("Error loading compiler.html:", err);
        res.status(500).send("Грешка при зареждане на компилаторския интерфейс.");
    }
});


// ... (Останалите помощни рутери, API и Socket.io остават непроменени) ...
app.get('/socket.io.js', (req, res) => {
    res.sendFile(path.join(
        __dirname,
        'node_modules',
        'socket.io',
        'client-dist',
        'socket.io.js'
    ));
});

app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

app.post('/api/run-code', async (req, res) => {
    const targetUrl = `${CSHARP_API_URL}/run-code`;
    const requestData = req.body;

    try {
        const response = await axios.post(targetUrl, requestData, {
            headers: { 'Content-Type': 'application/json' }
        });

        res.status(response.status).json(response.data);

    } catch (error) {
        console.error('--- Axios Proxy Error ---');

        if (error.response) {
            console.error(`C# API Status: ${error.response.status}`);
            console.error(`C# API Data:`, error.response.data);
            return res.status(error.response.status).json(error.response.data);
        }

        console.error('Network or Connection Error:', error.message);
        res.status(503).json({
            isSuccess: false,
            output: `Грешка при свързване с C# API (${CSHARP_API_URL}). Проверете дали C# сървърът работи.`
        });
    }
});

io.on('connection', (socket) => {
    console.log("Нов клиент се свърза!");
    // Твоята логика…
});


server.listen(PORT, () => {
    console.log(`✅ Сървърът работи на: http://localhost:${PORT}`);
    console.log(`├─ Главна страница: http://localhost:${PORT}/`);
    console.log(`├─ Padlet Учител: http://localhost:${PORT}/padlet`);
    console.log(`├─ Padlet Ученик: http://localhost:${PORT}/student`);
    console.log(`├─ Контролен панел: http://localhost:${PORT}/control`);
    console.log(`├─ Таймер: http://localhost:${PORT}/planner`);
    console.log(`├─ Компилатор: http://localhost:${PORT}/compiler`);
    console.log(`└─ C# API Target: ${CSHARP_API_URL}`);
});