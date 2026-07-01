require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const redis = require('./config/redis');
const { sendReport } = require('./services/discordLogger');
const initSocketServer = require('./socket/index');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// Initialize modular WebSocket Server
initSocketServer(server, redis);

// Report Route
app.post('/api/report', async (req, res) => {
    const { title, description, type } = req.body;
    if (!title || !description || !type) {
        return res.status(400).json({ error: "Missing fields" });
    }

    try {
        await sendReport(type, title, description);
        res.json({ success: true });
    } catch (error) {
        console.error("Discord Webhook Error:", error);
        res.status(500).json({ error: "Failed to send report" });
    }
});

app.get('/', (req, res) => { 
    res.send("Guftaguu Server is Alive!"); 
});

server.listen(3001, () => {
    console.log("SERVER RUNNING ON PORT 3001");
});