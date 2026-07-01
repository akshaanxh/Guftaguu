module.exports = function registerGameHandlers(io, socket, redis, context) {
    const { reactionState } = context;

    socket.on('request_game', (data) => {
        socket.to(data.roomId).emit('game_requested', data.gameType);
    });
    
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
    
    socket.on('decline_game', (data) => {
        socket.to(data.roomId).emit('game_declined');
    });
    
    socket.on('offer_draw', (data) => {
        socket.to(data.roomId).emit('draw_offered');
    });

    socket.on('decline_draw', (data) => {
        socket.to(data.roomId).emit('draw_declined');
    });

    socket.on('accept_draw', (data) => {
        io.to(data.roomId).emit('draw_accepted');
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
};
