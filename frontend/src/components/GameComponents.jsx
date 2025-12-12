import React from 'react';

// --- 1. WIN LOGIC HELPERS ---
export const checkTicTacToeWinner = (squares) => {
  if (!Array.isArray(squares)) return null;
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) return squares[a];
  }
  return null;
};

export const checkConnect4Winner = (board) => {
    if (!Array.isArray(board)) return null;
    const rows = 6; const cols = 7;
    for (let r = 0; r < rows; r++) { for (let c = 0; c < cols - 3; c++) { const i = r * cols + c; if (board[i] && board[i] === board[i+1] && board[i] === board[i+2] && board[i] === board[i+3]) return board[i]; } }
    for (let r = 0; r < rows - 3; r++) { for (let c = 0; c < cols; c++) { const i = r * cols + c; if (board[i] && board[i] === board[i+cols] && board[i] === board[i+cols*2] && board[i] === board[i+cols*3]) return board[i]; } }
    for (let r = 3; r < rows; r++) { for (let c = 0; c < cols - 3; c++) { const i = r * cols + c; if (board[i] && board[i] === board[i-cols+1] && board[i] === board[i-cols*2+2] && board[i] === board[i-cols*3+3]) return board[i]; } }
    for (let r = 0; r < rows - 3; r++) { for (let c = 0; c < cols - 3; c++) { const i = r * cols + c; if (board[i] && board[i] === board[i+cols+1] && board[i] === board[i+cols*2+2] && board[i] === board[i+cols*3+3]) return board[i]; } }
    return null;
};

// --- NEW HELPER: DOTS & BOXES WINNER ---
export const checkDotsBoxesWinner = (board) => {
    if (!board || !board.boxes) return null;
    const filledCount = board.boxes.filter(b => b !== null).length;
    if (filledCount < 25) return null; // Game not over

    const xCount = board.boxes.filter(b => b === 'X').length;
    const oCount = board.boxes.filter(b => b === 'O').length;

    if (xCount > oCount) return 'X';
    if (oCount > xCount) return 'O';
    return 'draw';
};


// --- 2. BOARD COMPONENTS ---

export const GameBoard = ({ gameType, board, onMove, winner, mySymbol, isMyTurn, statusMessage }) => {
    
    // --- DOTS & BOXES RENDERER ---
    if (gameType === 'dotsboxes') {
        const handleHLineClick = (r, c) => {
            if (winner || !isMyTurn) return;
            const index = r * 5 + c;
            if (board.hLines && board.hLines[index]) return;
            onMove({ type: 'h', index });
        };

        const handleVLineClick = (r, c) => {
            if (winner || !isMyTurn) return;
            const index = r * 6 + c;
            if (board.vLines && board.vLines[index]) return;
            onMove({ type: 'v', index });
        };

        const xScore = board.boxes ? board.boxes.filter(b => b === 'X').length : 0;
        const oScore = board.boxes ? board.boxes.filter(b => b === 'O').length : 0;

        return (
            <div className="flex flex-col flex-1 bg-zinc-900 rounded-xl border border-white/10 p-2 items-center justify-center relative min-h-[400px]">
                {statusMessage && <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 font-bold text-white rounded-xl">{statusMessage}</div>}
                
                <h3 className="text-xl font-bold mb-2 font-mono text-white">Dots & Boxes</h3>
                
                {/* SCOREBOARD */}
                <div className="flex gap-8 mb-4">
                    <div className={`flex flex-col items-center ${mySymbol === 'X' ? 'border-b-2 border-blue-500' : ''}`}>
                        <span className="text-blue-500 font-bold text-xl">{xScore}</span>
                        <span className="text-xs text-zinc-500">Player X</span>
                    </div>
                    <div className={`flex flex-col items-center ${mySymbol === 'O' ? 'border-b-2 border-red-500' : ''}`}>
                        <span className="text-red-500 font-bold text-xl">{oScore}</span>
                        <span className="text-xs text-zinc-500">Player O</span>
                    </div>
                </div>

                <div className={`mb-4 text-sm font-bold ${isMyTurn ? "text-green-400 animate-pulse" : "text-slate-500"}`}>
                    {winner ? (winner === mySymbol ? "You Won! 🎉" : "You Lost 😢") : (isMyTurn ? "YOUR TURN (Complete a box to keep turn!)" : "OPPONENT'S TURN")}
                </div>

                <div className="flex flex-col bg-black p-4 rounded-lg border border-white/10 select-none">
                   {/* 6 ROWS OF DOTS */}
                   {Array.from({ length: 6 }).map((_, r) => (
                       <React.Fragment key={r}>
                           {/* ROW OF DOTS + H-LINES */}
                           <div className="flex">
                               {Array.from({ length: 6 }).map((_, c) => (
                                   <div key={`dot-${r}-${c}`} className="flex items-center">
                                       <div className="w-2 h-2 md:w-3 md:h-3 bg-white rounded-full z-20 relative"></div>
                                       {/* Horizontal Line (5 per row) */}
                                       {c < 5 && (
                                           <div 
                                                onClick={(e) => { e.stopPropagation(); handleHLineClick(r, c); }}
                                                className={`h-2 md:h-3 w-8 md:w-12 transition-colors cursor-pointer z-10
                                                    ${board.hLines && board.hLines[r * 5 + c] ? 'bg-white' : 'bg-zinc-800 hover:bg-zinc-600'}
                                                `}
                                           />
                                       )}
                                   </div>
                               ))}
                           </div>
                           
                           {/* ROW OF V-LINES + BOXES (5 rows) */}
                           {r < 5 && (
                               <div className="flex">
                                   {Array.from({ length: 6 }).map((_, c) => (
                                       <React.Fragment key={`vrow-${r}-${c}`}>
                                           {/* Vertical Line */}
                                           <div 
                                                onClick={(e) => { e.stopPropagation(); handleVLineClick(r, c); }}
                                                className={`w-2 md:w-3 h-8 md:h-12 transition-colors cursor-pointer z-10
                                                    ${board.vLines && board.vLines[r * 6 + c] ? 'bg-white' : 'bg-zinc-800 hover:bg-zinc-600'}
                                                `}
                                           />
                                           {/* Box Content */}
                                           {c < 5 && (
                                               <div className="w-8 md:w-12 h-8 md:h-12 flex items-center justify-center bg-transparent">
                                                   {board.boxes && board.boxes[r * 5 + c] && (
                                                       <span className={`text-xl font-bold ${board.boxes[r * 5 + c] === 'X' ? 'text-blue-500' : 'text-red-500'}`}>
                                                           {board.boxes[r * 5 + c]}
                                                       </span>
                                                   )}
                                               </div>
                                           )}
                                       </React.Fragment>
                                   ))}
                               </div>
                           )}
                       </React.Fragment>
                   ))}
                </div>
            </div>
        );
    }

    // --- TICTACTOE & CONNECT4 (Unchanged) ---
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

            <div className={`grid gap-1 md:gap-2 bg-black p-2 rounded-lg border border-white/10 ${gameType === 'tictactoe' ? 'grid-cols-3' : 'grid-cols-7'}`}>
                {Array.isArray(board) && board.map((cell, idx) => (
                    <button 
                        key={idx} 
                        onClick={() => handleCellClick(idx)} 
                        className={`
                            flex items-center justify-center rounded transition font-bold shadow-sm
                            ${gameType === 'tictactoe' ? 'w-16 h-16 md:w-20 md:h-20 text-3xl md:text-4xl' : 'w-8 h-8 md:w-12 md:h-12 text-sm'} 
                            ${cell ? "bg-zinc-800 cursor-default" : "bg-zinc-900 active:bg-zinc-800 hover:bg-zinc-800"} 
                            ${cell === 'X' ? 'text-blue-400' : cell === 'O' ? 'text-red-400' : ''}
                        `}
                    >
                        {gameType === 'connect4' && cell === 'X' && <div className="w-5 h-5 md:w-8 md:h-8 rounded-full bg-red-500 shadow-[0_0_10px_red]"></div>}
                        {gameType === 'connect4' && cell === 'O' && <div className="w-5 h-5 md:w-8 md:h-8 rounded-full bg-yellow-400 shadow-[0_0_10px_yellow]"></div>}
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

export const ReactionBoard = ({ onClick, gameState, result }) => {
    if (result) {
        return (
            <div className="flex flex-col flex-1 bg-zinc-900 rounded-xl border border-white/10 p-4 items-center justify-center min-h-[300px]">
                <h3 className="text-2xl font-bold mb-4 text-white">Reaction Result</h3>
                <div className="text-5xl mb-4">{result.winner === 'me' ? "⚡" : "🐢"}</div>
                <div className={`text-3xl font-bold mb-2 ${result.winner === 'me' ? 'text-green-400' : 'text-red-500'}`}>
                    {result.winner === 'me' ? "You Won!" : "Opponent Won"}
                </div>
                <div className="text-xl font-mono text-zinc-400">{result.time}ms</div>
            </div>
        );
    }

    return (
        <div 
            onMouseDown={gameState === 'ready' ? onClick : null}
            className={`
                flex flex-col flex-1 rounded-xl border border-white/10 items-center justify-center min-h-[300px] cursor-pointer transition-colors duration-200 select-none
                ${gameState === 'waiting' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-500 active:bg-green-600'}
            `}
        >
            {gameState === 'waiting' ? (
                <div className="text-center">
                    <div className="text-6xl mb-4">🔴</div>
                    <h3 className="text-2xl font-bold text-white uppercase tracking-widest">Wait for Green...</h3>
                </div>
            ) : (
                <div className="text-center animate-bounce">
                    <div className="text-6xl mb-4">🟢</div>
                    <h3 className="text-3xl font-bold text-black uppercase tracking-widest">CLICK NOW!</h3>
                </div>
            )}
        </div>
    );
};