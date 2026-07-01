import React from 'react';

export const Connect4 = ({ board, onMove, winner, mySymbol, isMyTurn, statusMessage }) => {
    const handleCellClick = (idx) => {
        if (winner || !isMyTurn) return;
        const col = idx % 7;
        let foundRow = -1;
        for (let r = 5; r >= 0; r--) { 
            const i = r * 7 + col; 
            if (!board[i]) { 
                foundRow = i; 
                break; 
            } 
        }
        if (foundRow !== -1) onMove(foundRow);
    };

    return (
        <div className="flex flex-col flex-1 bg-zinc-900 rounded-xl border border-white/10 p-2 md:p-4 items-center justify-center relative min-h-[300px] md:min-h-0">
            {statusMessage && <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 font-bold text-white rounded-xl">{statusMessage}</div>}
            
            <h3 className="text-lg md:text-xl font-creative-title font-bold mb-2 md:mb-4 uppercase tracking-wider text-gradient-silver">
                Connect 4
            </h3>
            
            {winner ? (
                <div className="text-center mb-4">
                    <div className={`text-xl md:text-2xl font-bold mb-2 ${winner === 'draw' ? 'text-yellow-400' : 'text-green-400'}`}>
                        {winner === 'draw' ? "Draw! 🤝" : (winner === mySymbol ? "You Won! 🎉" : "You Lost 😢")}
                    </div>
                </div>
            ) : (
                <div className={`mb-2 md:mb-4 text-xs md:text-sm font-creative-title font-bold tracking-wide uppercase ${isMyTurn ? "text-green-400 animate-pulse" : "text-slate-500"}`}>
                    {isMyTurn ? "👇 YOUR TURN" : "⏳ OPPONENT'S TURN..."}
                </div>
            )}

            <div className="grid gap-1 md:gap-2 bg-black p-2 rounded-lg border border-white/10 grid-cols-7">
                {Array.isArray(board) && board.map((cell, idx) => (
                    <button 
                        key={idx} 
                        onClick={() => handleCellClick(idx)} 
                        className={`
                            flex items-center justify-center rounded transition font-bold shadow-sm
                            w-8 h-8 md:w-12 md:h-12 text-sm
                            ${cell ? "bg-zinc-800 cursor-default" : "bg-zinc-900 active:bg-zinc-800 hover:bg-zinc-800"} 
                            ${cell === 'X' ? 'text-blue-400' : cell === 'O' ? 'text-red-400' : ''}
                        `}
                    >
                        {cell === 'X' && <div className="w-5 h-5 md:w-8 md:h-8 rounded-full bg-red-500 shadow-[0_0_10px_red]"></div>}
                        {cell === 'O' && <div className="w-5 h-5 md:w-8 md:h-8 rounded-full bg-yellow-400 shadow-[0_0_10px_yellow]"></div>}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Connect4;
