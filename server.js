
require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const axios = require('axios');
const fs = require('fs');
const PORT = process.env.PORT || 3000;
const CSHARP_API_URL = process.env.CSHARP_API_URL || "http://localhost:5170";
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.json({ limit: '100mb' }));
app.use((req, res, next) => {
    const ext = path.extname(req.path).toLowerCase();
    if (ext === '.html') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
    if (ext === '.js') {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
    if (ext === '.css') {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
    next();
});
/* ----------------------------------------------------------------------- */
app.get('/', async (_, res) => {
    const htmlPath = path.join(__dirname, 'index.html');
    try {
        let htmlContent = await fs.promises.readFile(htmlPath, 'utf8');
        const pinScript = `<script>window.TEACHER_PIN_GLOBAL = "";</script>`;
        htmlContent = htmlContent.replace(/<\/head>/i, `${pinScript}<\/head>`);
        res.send(htmlContent);
    } catch (err) {
        console.error("Error loading index.html:", err);
        res.status(500).send("Грешка при зареждане на главната страница.");
    }
});
app.use(express.static(__dirname));
app.use('/tools', express.static(path.join(__dirname, 'tools')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));
app.get('/padlet', (_, res) => {
    res.sendFile(path.join(__dirname, 'tools', 'padlet', 'padlet-teacher.html'));
});
app.get('/student', (_, res) => {
    res.sendFile(path.join(__dirname, 'tools', 'padlet', 'padlet-student.html'));
});
app.get('/control', (_, res) => {
    res.sendFile(path.join(__dirname, 'tools', 'control', 'control.html'));
});
app.get('/planner', (_, res) => {
    res.sendFile(path.join(__dirname, 'tools', 'planner', 'planner.html'));
});
app.get('/compiler', async (_, res) => {
    const htmlPath = path.join(__dirname, 'tools', 'compiler', 'Frontend', 'compiler.html');
    try {
        let htmlContent = await fs.promises.readFile(htmlPath, 'utf8');
        const pinScript = `<script>window.TEACHER_PIN_GLOBAL = "";</script>`;
        htmlContent = htmlContent.replace(/<\/head>/i, `${pinScript}<\/head>`);
        res.send(htmlContent);
    } catch (err) {
        console.error("Error loading compiler.html:", err);
        res.status(500).send("Грешка при зареждане на компилаторския интерфейс.");
    }
});
app.get('/socket.io.js', (_, res) => {
    res.sendFile(path.join(
        __dirname,
        'node_modules',
        'socket.io',
        'client-dist',
        'socket.io.js'
    ));
});
app.get('/favicon.ico', (_, res) => {
    res.status(204).end();
});
app.post('/api/upload-image', async (req, res) => {
    const { base64Image, fileName } = req.body;
    if (!base64Image) {
        return res.status(400).json({ isSuccess: false, message: 'Missing base64Image in request body.' });
    }
    if (!IMGBB_API_KEY) {
        console.error('IMGBB_API_KEY is not set in environment variables!');
        return res.status(500).json({ isSuccess: false, message: 'Server configuration error: IMGBB API Key missing.' });
    }
    const uploadUrl = `https://api.imgbb.com/1/upload`;
    try {
        const formData = new URLSearchParams();
        formData.append('key', IMGBB_API_KEY);
        formData.append('image', base64Image);
        formData.append('expiration', 600);
        if (fileName) {
            formData.append('name', fileName);
        }
        const imgbbResponse = await axios.post(uploadUrl, formData.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        const imgUrl = imgbbResponse.data.data.url;
        if (!imgUrl) {
            throw new Error("Imgbb did not return a valid URL.");
        }
        res.status(200).json({ url: imgUrl, isSuccess: true });
    } catch (error) {
        console.error('--- Imgbb Upload Error ---');
        let errorMessage = 'Неизвестна грешка при качване.';
        if (error.response) {
            console.error(`Imgbb API Status: ${error.response.status}`);
            console.error(`Imgbb API Data:`, error.response.data);
            if (error.response.data && error.response.data.error) {
                errorMessage = `Imgbb API Error: ${error.response.data.error.message}`;
            } else {
                errorMessage = `Imgbb API Status ${error.response.status}: ${error.response.statusText}`;
            }
            return res.status(error.response.status).json({
                isSuccess: false,
                message: errorMessage
            });
        }
        console.error('Network or Connection Error:', error.message);
        res.status(503).json({
            isSuccess: false,
            message: `Грешка при свързване с Imgbb API: ${error.message}`
        });
    }
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
io.on('connection', () => {
    console.log("Нов клиент се свърза!");
});
server.listen(PORT, () => {
    console.log(`Сървърът работи на: http://localhost:${PORT}`);
    console.log(`├─ Главна страница: http://localhost:${PORT}/`);
    console.log(`├─ Padlet Учител: http://localhost:${PORT}/padlet`);
    console.log(`├─ Padlet Ученик: http://localhost:${PORT}/student`);
    console.log(`├─ Контролен панел: http://localhost:${PORT}/control`);
    console.log(`├─ Таймер: http://localhost:${PORT}/planner`);
    console.log(`└─ Компилатор: http://localhost:${PORT}/compiler`);
    console.log(`└─ C# API Target: ${CSHARP_API_URL}`);
});