const { Server } = require("socket.io");
const registerMatchmakingHandlers = require('./handlers/matchmaking');
const registerGameHandlers = require('./handlers/game');
const registerMessagingHandlers = require('./handlers/messaging');

function initSocketServer(server, redis) {
    const io = new Server(server, {
        cors: {
            origin: [
                "http://localhost:5173",
                "https://guftaguu.vercel.app"
            ],
            methods: ["GET", "POST"]
        },
        pingTimeout: 60000,    // How long to wait for pong before considering connection dead
        pingInterval: 10000,   // How often to send ping packets
        upgradeTimeout: 10000,
        transports: ['websocket', 'polling'] // Allow fallback to polling if websocket fails
    });

    // --- SESSION & CONNECTION TRACKING ---
    const activeUsers = {};    // userId -> { socketId, name, status, disconnectTimer }
    const socketUserMap = {};  // socket.id -> userId
    const userRooms = {};      // userId -> roomId
    const reactionState = {};  // roomId -> reaction game state

    const context = {
        activeUsers,
        socketUserMap,
        userRooms,
        reactionState
    };

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

        // Register sub-handlers
        registerMatchmakingHandlers(io, socket, redis, context);
        registerGameHandlers(io, socket, redis, context);
        registerMessagingHandlers(io, socket, redis, context);

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
                    console.log(`⏳ User ${myUserId} disconnected from room ${roomId}. Starting 60s reconnection window...`);
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
                    }, 60000); // 60 seconds — covers tab switches & brief network drops
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
    });

    // Stats Broadcast
    setInterval(() => {
        try {
            const totalUsers = io.engine.clientsCount;
            const busyUsers = Object.keys(userRooms).length;
            const idleUsers = Math.max(0, totalUsers - busyUsers);
            io.emit('site_stats', { idle: idleUsers, total: totalUsers });
        } catch (e) { 
            console.error("Stats Error:", e); 
        }
    }, 5000);

    return io;
}

module.exports = initSocketServer;
