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
    // Horizontal, Vertical, Diagonal checks...
    for (let r = 0; r < rows; r++) { for (let c = 0; c < cols - 3; c++) { const i = r * cols + c; if (board[i] && board[i] === board[i+1] && board[i] === board[i+2] && board[i] === board[i+3]) return board[i]; } }
    for (let r = 0; r < rows - 3; r++) { for (let c = 0; c < cols; c++) { const i = r * cols + c; if (board[i] && board[i] === board[i+cols] && board[i] === board[i+cols*2] && board[i] === board[i+cols*3]) return board[i]; } }
    for (let r = 3; r < rows; r++) { for (let c = 0; c < cols - 3; c++) { const i = r * cols + c; if (board[i] && board[i] === board[i-cols+1] && board[i] === board[i-cols*2+2] && board[i] === board[i-cols*3+3]) return board[i]; } }
    for (let r = 0; r < rows - 3; r++) { for (let c = 0; c < cols - 3; c++) { const i = r * cols + c; if (board[i] && board[i] === board[i+cols+1] && board[i] === board[i+cols*2+2] && board[i] === board[i+cols*3+3]) return board[i]; } }
    return null;
};

// --- 2. BOARD COMPONENTS (MOBILE OPTIMIZED) ---

export const GameBoard = ({ gameType, board, onMove, winner, mySymbol, isMyTurn, statusMessage }) => {
    const handleCellClick = (idx) => {
        if (winner || !isMyTurn) return;
        if (gameType === 'tictactoe') { if (board[idx]) return; onMove(idx); } 
        else if (gameType === 'connect4') {
            const col = idx % 7;
            let foundRow = -1;
            for (let r = 5; r >= 0; r--) { const i = r * 7 + col; if (!board[i]) { foundRow = i; break; } }
            if (foundRow !== -1) onMove(foundRow);
        }
    };

    return (
        // REMOVED "hidden". Added responsive padding and sizes.
        <div className="flex flex-col flex-1 bg-zinc-900 rounded-xl border border-white/10 p-2 md:p-4 items-center justify-center relative min-h-[300px] md:min-h-0">
            {statusMessage && <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 font-bold text-white rounded-xl">{statusMessage}</div>}
            
            <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-4 font-mono text-white">
                {gameType === 'tictactoe' ? 'Tic-Tac-Toe' : 'Connect 4'}
            </h3>
            
            {winner ? (
                <div className="text-center mb-4">
                    <div className={`text-xl md:text-2xl font-bold mb-2 ${winner === 'draw' ? 'text-yellow-400' : 'text-green-400'}`}>
                        {winner === 'draw' ? "Draw! 🤝" : (winner === mySymbol ? "You Won! 🎉" : "You Lost 😢")}
                    </div>
                </div>
            ) : (
                <div className={`mb-2 md:mb-4 text-xs md:text-sm font-bold ${isMyTurn ? "text-green-400 animate-pulse" : "text-slate-500"}`}>
                    {isMyTurn ? "👇 YOUR TURN" : "⏳ OPPONENT'S TURN..."}
                </div>
            )}

            {/* RESPONSIVE GRID */}
            <div className={`grid gap-1 md:gap-2 bg-black p-2 rounded-lg border border-white/10 ${gameType === 'tictactoe' ? 'grid-cols-3' : 'grid-cols-7'}`}>
                {board.map((cell, idx) => (
                    <button 
                        key={idx} 
                        onClick={() => handleCellClick(idx)} 
                        className={`
                            flex items-center justify-center rounded transition font-bold shadow-sm
                            /* MOBILE SIZES vs DESKTOP SIZES */
                            ${gameType === 'tictactoe' ? 'w-16 h-16 md:w-20 md:h-20 text-3xl md:text-4xl' : 'w-8 h-8 md:w-12 md:h-12 text-sm'} 
                            ${cell ? "bg-zinc-800 cursor-default" : "bg-zinc-900 active:bg-zinc-800 hover:bg-zinc-800"} 
                            ${cell === 'X' ? 'text-blue-400' : cell === 'O' ? 'text-red-400' : ''}
                        `}
                    >
                        {/* Connect 4 Circles - Resized for mobile */}
                        {gameType === 'connect4' && cell === 'X' && <div className="w-5 h-5 md:w-8 md:h-8 rounded-full bg-red-500 shadow-[0_0_10px_red]"></div>}
                        {gameType === 'connect4' && cell === 'O' && <div className="w-5 h-5 md:w-8 md:h-8 rounded-full bg-yellow-400 shadow-[0_0_10px_yellow]"></div>}
                        
                        {/* Tic Tac Toe Text */}
                        {gameType === 'tictactoe' && cell}
                    </button>
                ))}
            </div>
        </div>
    );
};

export const RPSBoard = ({ onMove, myMove, opponentMoved, result }) => {
    const choices = [ { id: 'R', label: '🪨', name: 'Rock' }, { id: 'P', label: '📄', name: 'Paper' }, { id: 'S', label: '✂️', name: 'Scissor' } ];

    if (result) {
        return (
            <div className="flex flex-col flex-1 bg-zinc-900 rounded-xl border border-white/10 p-4 items-center justify-center min-h-[300px]">
                <h3 className="text-xl md:text-2xl font-bold mb-4 text-white">Result</h3>
                <div className="flex gap-4 md:gap-8 items-center text-2xl md:text-4xl mb-6">
                    <div className="text-center"><div className="text-xs text-slate-400 mb-2">You</div><div className="p-3 md:p-4 bg-zinc-800 rounded-full border-2 border-green-500">{choices.find(c => c.id === result.myMove)?.label}</div></div>
                    <div className="text-xs text-slate-500 font-mono">VS</div>
                    <div className="text-center"><div className="text-xs text-slate-400 mb-2">Opponent</div><div className="p-3 md:p-4 bg-zinc-800 rounded-full border-2 border-red-500">{choices.find(c => c.id === result.theirMove)?.label}</div></div>
                </div>
                <div className={`text-xl md:text-3xl font-bold ${result.winner === 'draw' ? 'text-yellow-400' : result.winner === 'me' ? 'text-green-400' : 'text-red-500'}`}>
                    {result.winner === 'draw' ? "It's a Draw!" : result.winner === 'me' ? "You Won! 🎉" : "You Lost 💀"}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 bg-zinc-900 rounded-xl border border-white/10 p-4 items-center justify-center min-h-[300px]">
            <h3 className="text-lg md:text-xl font-bold mb-6 font-mono text-white">Rock Paper Scissors</h3>
            <div className="flex gap-2 md:gap-4 mb-6">
                {choices.map((choice) => (
                    <button key={choice.id} onClick={() => onMove(choice.id)} disabled={!!myMove} className={`p-3 md:p-6 rounded-xl border-2 transition-all active:scale-95 ${myMove === choice.id ? "bg-white text-black border-white scale-105" : "bg-black text-white border-zinc-700"} ${myMove && myMove !== choice.id ? "opacity-30" : ""}`}>
                        <div className="text-3xl md:text-5xl mb-1 md:mb-2">{choice.label}</div>
                        <div className="text-[10px] md:text-xs font-bold uppercase">{choice.name}</div>
                    </button>
                ))}
            </div>
            <div className="text-center h-6 text-xs md:text-sm font-mono">
                {myMove && !opponentMoved && <span className="text-yellow-400 animate-pulse">Waiting...</span>}
                {opponentMoved && !myMove && <span className="text-red-400 font-bold animate-bounce">Opponent ready!</span>}
                {myMove && opponentMoved && <span className="text-green-400">Revealing...</span>}
                {!myMove && !opponentMoved && <span className="text-slate-500">Pick one</span>}
            </div>
        </div>
    );
};