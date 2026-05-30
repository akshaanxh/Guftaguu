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
    cors: {
        origin: [
            "http://localhost:5173",
            "https://guftaguu.vercel.app"
        ],
        methods: ["GET", "POST"]
    },
    // ADD THESE CRITICAL SETTINGS
    pingTimeout: 30000,    // How long to wait for pong before considering connection dead
    pingInterval: 10000,   // How often to send ping packets
    upgradeTimeout: 10000,
    transports: ['websocket', 'polling'] // Allow fallback to polling if websocket fails
});

// --- SESSION & CONNECTION TRACKING ---
const activeUsers = {};    // userId -> { socketId, name, status, disconnectTimer }
const socketUserMap = {};  // socket.id -> userId
const userRooms = {};      // userId -> roomId
const reactionState = {};  // roomId -> reaction game state

io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId;
    let initialName = socket.handshake.auth.name || 'Stranger';
    const clientRoomId = socket.handshake.auth.roomId;

    if (userId) {
        console.log(`👤 User session identified: ${userId} (${initialName})`);
        socketUserMap[socket.id] = userId;

        // If the user already has a session
        const existingUser = activeUsers[userId];
        if (existingUser) {
            // Clear any active disconnect timer
            if (existingUser.disconnectTimer) {
                clearTimeout(existingUser.disconnectTimer);
                existingUser.disconnectTimer = null;
                console.log(`✨ Reconnection successful for user ${userId}`);
            }
            existingUser.socketId = socket.id;
            existingUser.status = 'active';
            if (initialName && initialName !== 'Stranger') {
                existingUser.name = initialName;
            }
        } else {
            activeUsers[userId] = {
                socketId: socket.id,
                name: initialName,
                status: 'active',
                disconnectTimer: null
            };
        }

        // Handle auto-rejoining room
        const activeRoomId = userRooms[userId];
        if (activeRoomId) {
            console.log(`🔄 Auto-rejoining user ${userId} to active room ${activeRoomId}`);
            socket.join(activeRoomId);
            
            // Find who the partner was
            const partnerUserId = activeRoomId.split('-').find(id => id !== userId);
            
            // Notify the partner that user is back online
            socket.to(activeRoomId).emit('partner_status_change', { status: 'active' });
            
            // Let the client know the rejoin was successful along with partner info
            socket.emit('rejoined_room', { 
                roomId: activeRoomId, 
                partnerId: partnerUserId,
                partnerName: activeUsers[partnerUserId]?.name || 'Stranger'
            });
        } else if (clientRoomId) {
            // Client reported a roomId but server doesn't have it (expired/closed)
            console.log(`💀 Client reported roomId ${clientRoomId} but server has no record. Declaring connection dead.`);
            socket.emit('connection_dead');
        }
    } else {
        console.log(`User Connected (anonymous): ${socket.id}`);
    }

    // --- ADD CONNECTION HEALTH CHECK ---
    socket.on('ping', () => {
        socket.emit('pong');
    });

    // --- MATCHMAKING (WITH PERSISTENT USER ID FIX) ---
    socket.on('find_match', async () => {
        const myUserId = socketUserMap[socket.id];
        if (!myUserId) return;

        // 1. Remove self from queue
        await redis.lrem('waiting_queue', 0, myUserId);

        let partnerUserId = await redis.rpop('waiting_queue');
        
        let attempts = 0;
        const MAX_ATTEMPTS = 10; 

        while (partnerUserId) {
            if (partnerUserId === myUserId) {
                partnerUserId = await redis.rpop('waiting_queue');
                continue;
            }

            const partnerInfo = activeUsers[partnerUserId];
            const partnerSocket = partnerInfo ? io.sockets.sockets.get(partnerInfo.socketId) : null;
            const isPartnerBusy = partnerUserId && userRooms[partnerUserId]; 
            
            if (partnerSocket && !isPartnerBusy && partnerInfo.status === 'active') {
                const [iBlockedThem, theyBlockedMe] = await Promise.all([
                    redis.get(`block:${myUserId}:${partnerUserId}`),
                    redis.get(`block:${partnerUserId}:${myUserId}`)
                ]);

                if (!iBlockedThem && !theyBlockedMe) {
                    console.log(`✅ MATCH FOUND! Pairing ${myUserId} with ${partnerUserId}`);
                    
                    const roomId = `${partnerUserId}-${myUserId}`;
                    
                    await partnerSocket.join(roomId);
                    await socket.join(roomId);
                    
                    userRooms[partnerUserId] = roomId;
                    userRooms[myUserId] = roomId;
                    
                    // --- THE FIX: WAIT 100ms ---
                    await new Promise(resolve => setTimeout(resolve, 100));

                    io.to(roomId).emit('match_found', { roomId, partnerId: partnerUserId });
                    return; 
                }
            }

            if (partnerSocket && partnerInfo && partnerInfo.status === 'active') {
                await redis.lpush('waiting_queue', partnerUserId);
            }
            
            attempts++;
            if (attempts >= MAX_ATTEMPTS) break;
            
            partnerUserId = await redis.rpop('waiting_queue');
        }

        await redis.lpush('waiting_queue', myUserId);
    });

    socket.on('send_name', (data) => {
        const { roomId, name } = data;
        let finalName = name;
        const lowerName = name.toLowerCase();
        const MY_SECRET_KEY = "veer117542"; 

        if (name === MY_SECRET_KEY) { finalName = "👑 Admin"; }
        else if (lowerName.includes("admin") || lowerName.includes("system") || lowerName.includes("mod")) { finalName = "⚠️ Imposter"; }
        socket.to(roomId).emit('receive_name', finalName);
    });

    socket.on('send_message', (data) => {
        const roomId = data.roomId;
        const targetSocket = io.sockets.sockets.get(socket.id);
        
        // Verify socket is still connected and in room
        if (!targetSocket || !targetSocket.rooms.has(roomId)) {
            socket.emit('connection_dead');
            return;
        }
        
        socket.to(roomId).emit('receive_message', data.message);
    });

    socket.on('block_user', async (data) => {
        const { roomId, partnerId } = data; // partnerId is partner's userId
        const myUserId = socketUserMap[socket.id];
        if (!myUserId) return;

        await redis.set(`block:${myUserId}:${partnerId}`, 1, 'EX', 600);
        socket.to(roomId).emit('partner_disconnected');
        socket.leave(roomId);
        
        delete userRooms[myUserId];
        delete userRooms[partnerId];
        delete reactionState[roomId];

        const partner = activeUsers[partnerId];
        if (partner && partner.disconnectTimer) {
            clearTimeout(partner.disconnectTimer);
            delete activeUsers[partnerId];
        }
    });

    socket.on('user_status_change', (data) => {
        const myUserId = socketUserMap[socket.id];
        if (!myUserId) return;

        const user = activeUsers[myUserId];
        if (user) {
            user.status = data.status; // 'active' or 'inactive'
            const roomId = userRooms[myUserId];
            if (roomId) {
                socket.to(roomId).emit('partner_status_change', { status: data.status });
            }
        }
    });

    socket.on('disconnect', async () => {
        const myUserId = socketUserMap[socket.id];
        if (!myUserId) {
            console.log(`User Disconnected (anonymous): ${socket.id}`);
            return;
        }

        console.log(`User Disconnected: ${socket.id} (User: ${myUserId})`);
        delete socketUserMap[socket.id];

        const user = activeUsers[myUserId];
        if (user) {
            user.status = 'disconnected';
            
            const roomId = userRooms[myUserId];
            if (roomId) {
                console.log(`⏳ User ${myUserId} disconnected from room ${roomId}. Starting 12s reconnection window...`);
                socket.to(roomId).emit('partner_status_change', { status: 'disconnected' });

                if (user.disconnectTimer) clearTimeout(user.disconnectTimer);
                
                user.disconnectTimer = setTimeout(async () => {
                    console.log(`💀 Reconnection window expired for user ${myUserId}. Cleaning up room.`);
                    
                    // Notify partner that they are gone permanently
                    socket.to(roomId).emit('partner_disconnected');
                    
                    // Clean up room association for both users
                    const partnerUserId = roomId.split('-').find(id => id !== myUserId);
                    
                    delete userRooms[myUserId];
                    if (partnerUserId) {
                        delete userRooms[partnerUserId];
                    }
                    delete activeUsers[myUserId];
                    delete reactionState[roomId];
                    
                    await redis.lrem('waiting_queue', 0, myUserId);
                    if (partnerUserId) {
                        await redis.lrem('waiting_queue', 0, partnerUserId);
                    }
                }, 12000); // 12 seconds grace period
            } else {
                // Not in a room, clean up immediately
                await redis.lrem('waiting_queue', 0, myUserId);
                delete activeUsers[myUserId];
            }
        }
    });

    // ADD ERROR HANDLER
    socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
        const myUserId = socketUserMap[socket.id];
        if (myUserId) {
            const roomId = userRooms[myUserId];
            if (roomId) {
                socket.to(roomId).emit('partner_status_change', { status: 'disconnected' });
            }
        }
    });

    // --- GAME LOGIC ---
    socket.on('request_game', (data) => socket.to(data.roomId).emit('game_requested', data.gameType));
    
    socket.on('accept_game', (data) => {
        const { roomId, gameType } = data;
        
        io.to(roomId).emit('game_start', { gameType, starterId: socket.id });

        if (gameType === 'reaction') {
            reactionState[roomId] = { active: false, startTime: 0, winnerDeclared: false };
            setTimeout(() => {
                if (io.sockets.adapter.rooms.get(roomId)) {
                    reactionState[roomId].active = true;
                    reactionState[roomId].startTime = Date.now();
                    io.to(roomId).emit('reaction_green_light', Date.now());
                }
            }, 5000); 
        }
    });
    
    socket.on('decline_game', (data) => socket.to(data.roomId).emit('game_declined'));
    
    socket.on('offer_draw', (data) => socket.to(data.roomId).emit('draw_offered'));
    socket.on('decline_draw', (data) => socket.to(data.roomId).emit('draw_declined'));
    socket.on('accept_draw', (data) => io.to(data.roomId).emit('draw_accepted'));
    
    socket.on('typing', (data) => socket.to(data.roomId).emit('display_typing', data.isTyping));

    socket.on('leave_room', (data) => {
        const { roomId } = data;
        socket.to(roomId).emit('partner_disconnected');
        socket.leave(roomId);
        
        const myUserId = socketUserMap[socket.id];
        if (myUserId) {
            delete userRooms[myUserId];
            delete reactionState[roomId];
        }
        
        const partnerUserId = roomId.split('-').find(id => id !== myUserId);
        if (partnerUserId) {
            delete userRooms[partnerUserId];
            const partner = activeUsers[partnerUserId];
            if (partner && partner.disconnectTimer) {
                clearTimeout(partner.disconnectTimer);
                delete activeUsers[partnerUserId];
            }
        }
    });

    socket.on('make_move', (data) => {
        const { roomId, index, symbol, gameType, extraData } = data;

        if (gameType === 'reaction') {
            const state = reactionState[roomId];
            if (!state || state.winnerDeclared) return;

            if (state.active) {
                state.winnerDeclared = true;
                const reactionTime = Date.now() - state.startTime;
                io.to(roomId).emit('reaction_result', { winnerId: socket.id, time: reactionTime });
                delete reactionState[roomId];
            }
            return;
        }

        socket.to(roomId).emit('receive_move', { index, symbol, extraData });
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

app.get('/', (req, res) => { res.send("Guftaguu Server is Alive!"); });

// Stats Broadcast
setInterval(() => {
    try {
        const totalUsers = io.engine.clientsCount;
        const busyUsers = Object.keys(userRooms).length;
        const idleUsers = Math.max(0, totalUsers - busyUsers);
        io.emit('site_stats', { idle: idleUsers, total: totalUsers });
    } catch (e) { console.error("Stats Error:", e); }
}, 5000);

server.listen(3001, () => {
    console.log("SERVER RUNNING ON PORT 3001");
});