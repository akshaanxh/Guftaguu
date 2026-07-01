module.exports = function registerMatchmakingHandlers(io, socket, redis, context) {
    const { activeUsers, socketUserMap, userRooms, reactionState } = context;

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

    socket.on('block_user', async (data) => {
        const { roomId, partnerId } = data;
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
};
