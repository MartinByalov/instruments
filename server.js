// server.js
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
const TEACHER_PIN = process.env.TEACHER_PIN;

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

app.post('/api/check-pin', (req, res) => {
    const { pin } = req.body;
    if (!TEACHER_PIN || TEACHER_PIN.length === 0) {
        console.error('TEACHER_PIN is not set in environment variables!');
        return res.status(500).json({ success: false, message: 'Server error: TEACHER_PIN is not configured.' });
    }
    if (pin === TEACHER_PIN) {
        res.json({ success: true, message: 'Успешен достъп.' });
    } else {
        res.status(401).json({ success: false, message: 'Невалиден ПИН.' });
    }
});

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

app.get('/padlet', (_, res) => res.sendFile(path.join(__dirname, 'tools', 'padlet', 'padlet-teacher.html')));
app.get('/student', (_, res) => res.sendFile(path.join(__dirname, 'tools', 'padlet', 'padlet-student.html')));
app.get('/control', (_, res) => res.sendFile(path.join(__dirname, 'tools', 'control', 'control.html')));
app.get('/planner', (_, res) => res.sendFile(path.join(__dirname, 'tools', 'planner', 'planner.html')));
app.get('/wpm', (_, res) => res.sendFile(path.join(__dirname, 'tools', 'wpm', 'wpm.html')));
app.get('/qrcode', (_, res) => res.sendFile(path.join(__dirname, 'tools', 'qr_code', 'qr_code.html')));
app.get('/multiclass', (_, res) => res.sendFile(path.join(__dirname, 'tools', 'multiclass', 'multiclass.html')));
app.get('/cipher', (_, res) => res.sendFile(path.join(__dirname, 'tools', 'cipher', 'cipher.html')));
app.get('/cipher/enigma.html', (_, res) => res.sendFile(path.join(__dirname, 'tools', 'cipher', 'enigma.html')));

app.get('/compiler', async (_, res) => {
    const htmlPath = path.join(__dirname, 'tools', 'compiler', 'Frontend', 'compiler.html');
    try {
        let htmlContent = await fs.promises.readFile(htmlPath, 'utf8');
        const scriptInjection = `
<script>
    window.CSHARP_API_URL_GLOBAL = "${CSHARP_API_URL}";
</script>
</head>`;
        htmlContent = htmlContent.replace(/<\/head>/i, scriptInjection);
        res.send(htmlContent);
    } catch (err) {
        console.error("Error loading compiler.html:", err);
        res.status(500).send("Грешка при зареждане на компилаторския интерфейс.");
    }
});

app.get('/socket.io.js', (_, res) => {
    res.sendFile(path.join(__dirname, 'node_modules', 'socket.io', 'client-dist', 'socket.io.js'));
});

app.post('/api/upload-image', async (req, res) => {
    const { base64Image, fileName } = req.body;
    if (!base64Image) return res.status(400).json({ isSuccess: false, message: 'Missing base64Image.' });
    if (!IMGBB_API_KEY) return res.status(500).json({ isSuccess: false, message: 'Imgbb API Key missing.' });
    
    try {
        const formData = new URLSearchParams();
        formData.append('key', IMGBB_API_KEY);
        formData.append('image', base64Image);
        formData.append('expiration', 600);
        if (fileName) formData.append('name', fileName);

        const imgbbResponse = await axios.post(`https://api.imgbb.com/1/upload`, formData.toString());
        res.status(200).json({ url: imgbbResponse.data.data.url, isSuccess: true });
    } catch (error) {
        res.status(500).json({ isSuccess: false, message: error.message });
    }
});

app.post('/api/run-code', async (req, res) => {
    const targetUrl = `${CSHARP_API_URL}/run-code`;
    try {
        const response = await axios.post(targetUrl, req.body, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000 
        });
        res.status(response.status).json(response.data);
    } catch (error) {
        if (error.response && error.response.status === 429) {
            return res.status(429).json({
                isSuccess: false,
                output: "Сървърът е временно претоварен (Render Rate Limit). Моля, изчакайте 5 секунди и опитайте пак."
            });
        }
        const status = error.response ? error.response.status : 503;
        const data = error.response ? error.response.data : { isSuccess: false, output: "C# API не отговаря (Cold Start)." };
        res.status(status).json(data);
    }
});

io.on('connection', (socket) => {
    console.log("Нов клиент се свърза!");
});

server.listen(PORT, () => {
    console.log(`Сървърът работи на: http://localhost:${PORT}`);
    console.log(`└─ C# API Target: ${CSHARP_API_URL}`);
});