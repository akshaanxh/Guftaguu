import React from 'react';

export const DotsBoxes = ({ board, onMove, winner, mySymbol, isMyTurn, statusMessage }) => {
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
};

export default DotsBoxes;
