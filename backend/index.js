require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const Redis = require('ioredis');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// Connect to Redis
const redis = new Redis(process.env.REDIS_URL, { family: 0 });

redis.on('connect', async () => {
    console.log("✅ CONNECTED TO REDIS CLOUD!");
    await redis.del('waiting_queue');
    console.log("🧹 Waiting queue cleared.");
});

redis.on('error', (err) => console.error("❌ Redis Error:", err));

const io = new Server(server, {
    cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});

// --- GLOBAL VARIABLES (Must be outside io.on) ---
const userRooms = {}; 
const rpsMoves = {}; // <--- THIS WAS THE FIX

io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // --- MATCHMAKING ---
    socket.on('find_match', async () => {
        console.log(`User ${socket.id} looking for match...`);
        let partnerId = await redis.rpop('waiting_queue');
        let attempts = 0;
        
        while (partnerId) {
            attempts++;
            const iBlockedThem = await redis.get(`block:${socket.id}:${partnerId}`);
            const theyBlockedMe = await redis.get(`block:${partnerId}:${socket.id}`);
            const partnerSocket = io.sockets.sockets.get(partnerId);
            const isValidUser = partnerSocket && partnerId !== socket.id;

            if (isValidUser && !iBlockedThem && !theyBlockedMe) {
                const roomId = `${partnerId}-${socket.id}`;
                partnerSocket.join(roomId);
                socket.join(roomId);
                userRooms[partnerId] = roomId;
                userRooms[socket.id] = roomId;
                io.to(roomId).emit('match_found', { roomId, partnerId });
                return; 
            }
            if (partnerSocket && partnerId !== socket.id) {
                await redis.lpush('waiting_queue', partnerId);
            }
            if (attempts >= 5) break; 
            partnerId = await redis.rpop('waiting_queue');
        }
        await redis.lpush('waiting_queue', socket.id);
    });

    // NEW: Handle Name Exchange
    socket.on('send_name', (data) => {
        const { roomId, name } = data;
        // Tell the other person in the room what my name is
        socket.to(roomId).emit('receive_name', name);
    });

    socket.on('send_message', (data) => {
        socket.to(data.roomId).emit('receive_message', data.message);
    });

    socket.on('block_user', async (data) => {
        const { roomId, partnerId } = data;
        await redis.set(`block:${socket.id}:${partnerId}`, 1, 'EX', 600);
        socket.to(roomId).emit('partner_disconnected');
        socket.leave(roomId);
        delete userRooms[socket.id];
    });

    socket.on('disconnect', async () => {
        await redis.lrem('waiting_queue', 0, socket.id);
        const roomId = userRooms[socket.id];
        if (roomId) {
            socket.to(roomId).emit('partner_disconnected');
            delete userRooms[socket.id];
            // Clean up RPS moves if they leave mid-game
            delete rpsMoves[roomId]; 
        }
        console.log(`User Disconnected: ${socket.id}`);
    });

    // --- GAME LOGIC ---
    socket.on('request_game', (data) => socket.to(data.roomId).emit('game_requested', data.gameType));
    
    socket.on('accept_game', (data) => {
        // Clear any old RPS moves for this room when starting new
        delete rpsMoves[data.roomId];
        io.to(data.roomId).emit('game_start', { gameType: data.gameType, starterId: socket.id });
    });
    
    socket.on('decline_game', (data) => socket.to(data.roomId).emit('game_declined'));
    
    socket.on('typing', (data) => socket.to(data.roomId).emit('display_typing', data.isTyping));

    socket.on('leave_room', (data) => {
        const { roomId } = data;
        socket.to(roomId).emit('partner_disconnected');
        socket.leave(roomId);
        delete userRooms[socket.id];
        delete rpsMoves[roomId];
    });

    // --- MOVE LOGIC (Board + RPS) ---
    socket.on('make_move', (data) => {
        const { roomId, index, symbol, gameType } = data;

        // 1. BOARD GAMES
        if (gameType !== 'rps') {
            socket.to(roomId).emit('receive_move', { index, symbol });
            return;
        }

        // 2. RPS LOGIC
        if (!rpsMoves[roomId]) rpsMoves[roomId] = {};
        rpsMoves[roomId][socket.id] = symbol; // Store move

        const players = Object.keys(rpsMoves[roomId]);

        if (players.length === 2) {
            // Both moved! Reveal.
            const p1 = players[0];
            const p2 = players[1];
            io.to(roomId).emit('rps_reveal', { 
                moves: { 
                    [p1]: rpsMoves[roomId][p1], 
                    [p2]: rpsMoves[roomId][p2] 
                } 
            });
            delete rpsMoves[roomId]; // Reset for next round
        } else {
            // Waiting for other player
            socket.to(roomId).emit('rps_waiting');
        }
    });
});

// Report Route
app.post('/api/report', async (req, res) => {
    const { title, description, type } = req.body;
    if (!title || !description || !type) return res.status(400).json({ error: "Missing fields" });

    const embed = {
        title: `📢 New ${type}`,
        color: type === 'Bug Report' ? 15548997 : 5763719,
        fields: [{ name: "Title", value: title }, { name: "Description", value: description }],
        footer: { text: "Guftaguu Report System" },
        timestamp: new Date().toISOString()
    };

    try {
        if(process.env.DISCORD_WEBHOOK_URL) await axios.post(process.env.DISCORD_WEBHOOK_URL, { embeds: [embed] });
        res.json({ success: true });
    } catch (error) {
        console.error("Discord Webhook Error:", error);
        res.status(500).json({ error: "Failed to send report" });
    }
});

// Add a simple route for the keep-alive ping
app.get('/', (req, res) => {
    res.send("Guftaguu Server is Alive!");
});

server.listen(3001, () => {
    console.log("SERVER RUNNING ON PORT 3001");
});

server.listen(3001, () => {
    console.log("SERVER RUNNING ON PORT 3001");
});