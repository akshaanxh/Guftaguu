module.exports = function registerMessagingHandlers(io, socket, redis, context) {
    const { activeUsers, socketUserMap, userRooms, reactionState } = context;

    socket.on('send_name', (data) => {
        const { roomId, name } = data;
        let finalName = name;
        const lowerName = name.toLowerCase();
        const MY_SECRET_KEY = "veer117542"; 

        if (name === MY_SECRET_KEY) { 
            finalName = "👑 Admin"; 
        } else if (lowerName.includes("admin") || lowerName.includes("system") || lowerName.includes("mod")) { 
            finalName = "⚠️ Imposter"; 
        }
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

    socket.on('typing', (data) => {
        socket.to(data.roomId).emit('display_typing', data.isTyping);
    });

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
};
