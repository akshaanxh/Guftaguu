import React from 'react';

// --- 1. WIN LOGIC HELPERS ---

export const checkTicTacToeWinner = (squares) => {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) return squares[a];
  }
  return null;
};

export const checkConnect4Winner = (board) => {
    const rows = 6; const cols = 7;
    // Horizontal
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols - 3; c++) {
            const i = r * cols + c;
            if (board[i] && board[i] === board[i+1] && board[i] === board[i+2] && board[i] === board[i+3]) return board[i];
        }
    }
    // Vertical
    for (let r = 0; r < rows - 3; r++) {
        for (let c = 0; c < cols; c++) {
            const i = r * cols + c;
            if (board[i] && board[i] === board[i+cols] && board[i] === board[i+cols*2] && board[i] === board[i+cols*3]) return board[i];
        }
    }
    // Diagonal /
    for (let r = 3; r < rows; r++) {
        for (let c = 0; c < cols - 3; c++) {
            const i = r * cols + c;
            if (board[i] && board[i] === board[i-cols+1] && board[i] === board[i-cols*2+2] && board[i] === board[i-cols*3+3]) return board[i];
        }
    }
    // Diagonal \
    for (let r = 0; r < rows - 3; r++) {
        for (let c = 0; c < cols - 3; c++) {
            const i = r * cols + c;
            if (board[i] && board[i] === board[i+cols+1] && board[i] === board[i+cols*2+2] && board[i] === board[i+cols*3+3]) return board[i];
        }
    }
    return null;
};

// --- 2. BOARD COMPONENTS ---

export const GameBoard = ({ gameType, board, onMove, winner, mySymbol, isMyTurn, statusMessage }) => {
    const handleCellClick = (idx) => {
        if (winner || !isMyTurn) return;

        if (gameType === 'tictactoe') {
            if (board[idx]) return; 
            onMove(idx);
        } 
        else if (gameType === 'connect4') {
            const col = idx % 7;
            let foundRow = -1;
            for (let r = 5; r >= 0; r--) {
                const i = r * 7 + col;
                if (!board[i]) { foundRow = i; break; }
            }
            if (foundRow !== -1) onMove(foundRow);
        }
    };

    return (
        <div className="hidden md:flex flex-col flex-1 bg-zinc-900 rounded border border-white/10 p-4 items-center justify-center relative">
            {statusMessage && <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 font-bold text-white">{statusMessage}</div>}
            
            <h3 className="text-xl font-bold mb-4 font-mono text-white">
                {gameType === 'tictactoe' ? 'Tic-Tac-Toe' : 'Connect 4'}
            </h3>
            
            {/* UPDATED WINNER/DRAW SECTION */}
            {winner ? (
                <div className="text-center mb-4">
                    <div className={`text-2xl font-bold mb-2 ${winner === 'draw' ? 'text-yellow-400' : 'text-green-400'}`}>
                        {winner === 'draw' ? "It's a Draw! 🤝" : (winner === mySymbol ? "You Won! 🎉" : "You Lost 😢")}
                    </div>
                </div>
            ) : (
                <div className={`mb-4 text-sm font-bold ${isMyTurn ? "text-green-400" : "text-slate-500"}`}>
                    {isMyTurn ? "YOUR TURN" : "Opponent's Turn..."}
                </div>
            )}

            <div className={`grid gap-2 bg-black p-2 rounded border border-white/10 ${gameType === 'tictactoe' ? 'grid-cols-3' : 'grid-cols-7'}`}>
                {board.map((cell, idx) => (
                    <button key={idx} onClick={() => handleCellClick(idx)} className={`flex items-center justify-center rounded transition font-bold ${gameType === 'tictactoe' ? 'w-16 h-16 text-3xl' : 'w-10 h-10 text-xl'} ${cell ? "bg-zinc-800 cursor-default" : "bg-zinc-900 hover:bg-zinc-800"} ${cell === 'X' ? 'text-blue-400' : cell === 'O' ? 'text-red-400' : ''}`}>
                        {gameType === 'connect4' && cell === 'X' && <div className="w-6 h-6 rounded-full bg-red-500 shadow-lg shadow-red-500/50"></div>}
                        {gameType === 'connect4' && cell === 'O' && <div className="w-6 h-6 rounded-full bg-yellow-400 shadow-lg shadow-yellow-400/50"></div>}
                        {gameType === 'tictactoe' && cell}
                    </button>
                ))}
            </div>
        </div>
    );
};

export const RPSBoard = ({ onMove, myMove, opponentMoved, result }) => {
    const choices = [
        { id: 'R', label: '🪨', name: 'Rock' },
        { id: 'P', label: '📄', name: 'Paper' },
        { id: 'S', label: '✂️', name: 'Scissors' }
    ];

    if (result) {
        return (
            <div className="hidden md:flex flex-col flex-1 bg-zinc-900 rounded border border-white/10 p-4 items-center justify-center">
                <h3 className="text-2xl font-bold mb-8 text-white">Result</h3>
                <div className="flex gap-8 items-center text-4xl mb-8">
                    <div className="text-center">
                        <div className="text-sm text-slate-400 mb-2">You</div>
                        <div className="p-4 bg-zinc-800 rounded-full border-2 border-green-500">{choices.find(c => c.id === result.myMove)?.label}</div>
                    </div>
                    <div className="text-sm text-slate-500 font-mono">VS</div>
                    <div className="text-center">
                        <div className="text-sm text-slate-400 mb-2">Opponent</div>
                        <div className="p-4 bg-zinc-800 rounded-full border-2 border-red-500">{choices.find(c => c.id === result.theirMove)?.label}</div>
                    </div>
                </div>
                <div className={`text-3xl font-bold ${result.winner === 'draw' ? 'text-yellow-400' : result.winner === 'me' ? 'text-green-400' : 'text-red-500'}`}>
                    {result.winner === 'draw' ? "It's a Draw!" : result.winner === 'me' ? "You Won! 🎉" : "You Lost 💀"}
                </div>
            </div>
        );
    }

    return (
        <div className="hidden md:flex flex-col flex-1 bg-zinc-900 rounded border border-white/10 p-4 items-center justify-center">
            <h3 className="text-xl font-bold mb-8 font-mono text-white">Rock Paper Scissors</h3>
            <div className="flex gap-4 mb-8">
                {choices.map((choice) => (
                    <button key={choice.id} onClick={() => onMove(choice.id)} disabled={!!myMove} className={`p-6 rounded-xl border-2 transition-all transform hover:scale-110 ${myMove === choice.id ? "bg-white text-black border-white scale-110" : "bg-black text-white border-zinc-700 hover:border-white"} ${myMove && myMove !== choice.id ? "opacity-30 cursor-not-allowed" : ""}`}>
                        <div className="text-5xl mb-2">{choice.label}</div>
                        <div className="text-xs font-bold uppercase">{choice.name}</div>
                    </button>
                ))}
            </div>
            <div className="text-center h-8 font-mono">
                {myMove && !opponentMoved && <span className="text-yellow-400 animate-pulse">Waiting for opponent...</span>}
                {opponentMoved && !myMove && <span className="text-red-400 font-bold animate-bounce">Opponent is ready!</span>}
                {myMove && opponentMoved && <span className="text-green-400">Revealing...</span>}
                {!myMove && !opponentMoved && <span className="text-slate-500">Pick your weapon</span>}
            </div>
        </div>
    );
};