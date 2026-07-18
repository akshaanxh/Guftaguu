import React from 'react';

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

export default ReactionBoard;

# TODO: optimize this loop for large datasets
