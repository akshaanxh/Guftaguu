import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
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
            
            <h3 className="text-lg md:text-xl font-creative-title font-bold mb-2 md:mb-4 uppercase tracking-wider text-gradient-silver">
                {gameType === 'tictactoe' ? 'Tic-Tac-Toe' : 'Connect 4'}
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

export const ChessBoardGame = ({ 
    gameState, 
    onMove, 
    mySymbol, 
    isMyTurn, 
    statusMessage, 
    onGameEnd,
    onOfferDraw,
    drawStatusMessage
}) => {
    const [game, setGame] = useState(new Chess());
    const [optionSquares, setOptionSquares] = useState({});
    const [selectedSquare, setSelectedSquare] = useState(null);
    
    // Promotion state
    const [pendingPromotion, setPendingPromotion] = useState(null); // { from, to }
    
    // Timer state
    const [whiteTime, setWhiteTime] = useState(null);
    const [blackTime, setBlackTime] = useState(null);

    // Sync board from incoming gameState
    useEffect(() => {
        const newGame = new Chess();
        if (gameState && gameState.fen && gameState.fen !== 'start') {
            try { newGame.load(gameState.fen); } catch(e) { console.error('FEN load error:', e); }
        }
        setGame(newGame);
        // Clear any selection when board updates from opponent
        setSelectedSquare(null);
        setOptionSquares({});
        setPendingPromotion(null);

        if (gameState) {
            if (gameState.whiteTime !== undefined) setWhiteTime(gameState.whiteTime);
            if (gameState.blackTime !== undefined) setBlackTime(gameState.blackTime);
        }
    }, [gameState]);

    // Timer countdown
    useEffect(() => {
        if (whiteTime === null || blackTime === null) return;
        if (game.isGameOver()) return;

        const interval = setInterval(() => {
            if (game.turn() === 'w') {
                setWhiteTime(prev => {
                    if (prev <= 1) { onGameEnd && onGameEnd(mySymbol === 'X' ? 'my_timeout' : 'opponent_timeout'); return 0; }
                    return prev - 1;
                });
            } else {
                setBlackTime(prev => {
                    if (prev <= 1) { onGameEnd && onGameEnd(mySymbol === 'O' ? 'my_timeout' : 'opponent_timeout'); return 0; }
                    return prev - 1;
                });
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [game.turn(), whiteTime, blackTime, mySymbol, onGameEnd, game]);

    // Detect checkmate/draw
    useEffect(() => {
        if (game.isCheckmate()) {
            const winnerIsWhite = game.turn() === 'b';
            const amIWhite = mySymbol === 'X';
            onGameEnd && onGameEnd(winnerIsWhite === amIWhite ? 'me' : 'opponent');
        } else if (game.isDraw()) {
            onGameEnd && onGameEnd('draw');
        }
    }, [game, mySymbol, onGameEnd]);

    const formatTime = (seconds) => {
        if (seconds === null) return null;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Determine whose turn it is based on the engine, not socket state
    const amIWhite = mySymbol === 'X';
    const myColor = amIWhite ? 'w' : 'b';
    const isMyTurnNow = game.turn() === myColor;

    const showMoveOptions = (square) => {
        const moves = game.moves({ square, verbose: true });
        if (moves.length === 0) {
            setOptionSquares({});
            return false;
        }
        const newSquares = {};
        moves.forEach(move => {
            const targetPiece = game.get(move.to);
            const isCapture = targetPiece !== null || move.flags.includes('e');
            if (isCapture) {
                // Red tint on the entire tile for captures
                newSquares[move.to] = { background: 'rgba(239, 68, 68, 0.45)' };
            } else {
                // Solid black dot for normal moves
                newSquares[move.to] = {
                    background: 'radial-gradient(circle, rgba(0, 0, 0, 0.65) 22%, transparent 23%)',
                    borderRadius: '50%',
                };
            }
        });
        newSquares[square] = { background: 'rgba(255, 255, 0, 0.4)' };
        setOptionSquares(newSquares);
        return true;
    };

    // Execute a move (used for normal moves and after promotion choice)
    const executeMove = (from, to, promotionPiece) => {
        const gameCopy = new Chess(game.fen());
        try {
            const move = gameCopy.move({ from, to, promotion: promotionPiece || undefined });
            if (move) {
                setGame(gameCopy);
                onMove({ fen: gameCopy.fen(), whiteTime, blackTime });
            }
        } catch (e) {
            console.error('Move error:', e);
        }
        setSelectedSquare(null);
        setOptionSquares({});
    };

    // Handle promotion piece choice from dialog
    const handlePromotionChoice = (piece) => {
        if (!pendingPromotion) return;
        executeMove(pendingPromotion.from, pendingPromotion.to, piece);
        setPendingPromotion(null);
    };

    // Click handler — receives { piece, square } from react-chessboard v5
    const handleSquareClick = (clickData) => {
        const square = typeof clickData === 'object' ? clickData.square : clickData;
        if (!square) return;

        if (pendingPromotion) return; // Block clicks while promotion dialog is open
        if (!isMyTurnNow) return;
        
        const clickedPiece = game.get(square);

        // No piece selected yet — try to select one
        if (!selectedSquare) {
            if (clickedPiece && clickedPiece.color === myColor) {
                setSelectedSquare(square);
                showMoveOptions(square);
            }
            return;
        }

        // If clicking another own piece, switch selection
        if (clickedPiece && clickedPiece.color === myColor) {
            setSelectedSquare(square);
            showMoveOptions(square);
            return;
        }

        // Check if this is a promotion move
        const movingPiece = game.get(selectedSquare);
        const isPromotion = movingPiece && movingPiece.type === 'p' && 
            ((myColor === 'w' && square[1] === '8') || (myColor === 'b' && square[1] === '1'));

        if (isPromotion) {
            // Validate move is legal before showing dialog
            const testGame = new Chess(game.fen());
            try {
                const testMove = testGame.move({ from: selectedSquare, to: square, promotion: 'q' });
                if (testMove) {
                    setPendingPromotion({ from: selectedSquare, to: square });
                    return; // Wait for user choice
                }
            } catch(e) {}
            setSelectedSquare(null);
            setOptionSquares({});
            return;
        }

        // Normal move
        executeMove(selectedSquare, square, undefined);
    };

    const isCheck = game.inCheck();
    const isMate = game.isCheckmate();
    const isDraw = game.isDraw();
    const boardOrientation = amIWhite ? 'white' : 'black';
    
    let displayMessage = '';
    if (drawStatusMessage) {
        displayMessage = drawStatusMessage;
    } else if (isMate) {
        displayMessage = game.turn() === myColor ? 'You got Checkmated 😢' : 'You Won by Checkmate! 🎉';
    } else if (isDraw) {
        displayMessage = 'Draw! 🤝';
    } else if (isCheck) {
        displayMessage = game.turn() === myColor ? '🚨 YOU ARE IN CHECK!' : '🚨 OPPONENT IN CHECK!';
    } else {
        displayMessage = isMyTurnNow ? '👇 YOUR TURN' : '⏳ OPPONENT\'S TURN...';
    }

    const oppTime = amIWhite ? formatTime(blackTime) : formatTime(whiteTime);
    const myTime = amIWhite ? formatTime(whiteTime) : formatTime(blackTime);
    const isOppTurn = game.turn() !== myColor;

    const promotionPieces = [
        { piece: 'q', label: '♛', name: 'Queen' },
        { piece: 'r', label: '♜', name: 'Rook' },
        { piece: 'b', label: '♝', name: 'Bishop' },
        { piece: 'n', label: '♞', name: 'Knight' },
    ];

    return (
        <div className="flex flex-col flex-1 bg-zinc-900 rounded-xl border border-white/10 p-2 md:p-4 items-center justify-center relative min-h-[260px] md:min-h-[350px]">
             {statusMessage && <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 font-bold text-white rounded-xl">{statusMessage}</div>}
             
             {/* PROMOTION DIALOG */}
             {pendingPromotion && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30 rounded-xl">
                      <div className="bg-zinc-800 border border-white/10 rounded-2xl p-5 text-center">
                          <h4 className="text-white font-bold text-lg mb-4">Promote Pawn</h4>
                          <div className="flex gap-3">
                              {promotionPieces.map(({ piece, label, name }) => (
                                  <button
                                      key={piece}
                                      onClick={() => handlePromotionChoice(piece)}
                                      className="w-16 h-16 bg-zinc-700 hover:bg-zinc-600 border border-white/10 rounded-xl flex items-center justify-center text-4xl transition-all hover:scale-110 active:scale-95"
                                      title={name}
                                  >
                                      {label}
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>
             )}


             <div className="w-full flex justify-between items-center mb-2 px-2 max-w-[250px] md:max-w-[320px]">
                  <h3 className="text-base md:text-xl font-creative-title font-bold text-white uppercase tracking-wider text-gradient-silver">Chess</h3>
                  <div className={`text-[10px] md:text-xs font-creative-title font-bold px-2 py-1 rounded uppercase tracking-wide transition-all duration-300 ${
                      isCheck || isMate 
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.15)] animate-pulse' 
                          : 'bg-black/40 text-slate-400 border border-white/5'
                  }`}>
                      {displayMessage}
                  </div>
              </div>
              
              <div className="w-full max-w-[250px] md:max-w-[320px] flex flex-col gap-2 mx-auto">
                   {oppTime && (
                       <div className={`self-end font-creative-title text-base md:text-lg font-bold px-3 py-1.5 rounded-xl border transition-all duration-300 ${
                           isOppTurn 
                               ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse' 
                               : 'bg-zinc-800/80 text-zinc-300 border-white/5'
                       }`}>
                           {oppTime}
                       </div>
                   )}
                   <Chessboard 
                      options={{
                          position: game.fen(),
                          onSquareClick: handleSquareClick,
                          squareStyles: optionSquares,
                          boardOrientation: boardOrientation,
                          allowDragging: false,
                          darkSquareStyle: { backgroundColor: '#779556' },
                          lightSquareStyle: { backgroundColor: '#ebecd0' },
                      }}
                   />
                   
                   {/* Bottom Control Bar containing Clocks and Draw Button */}
                   <div className="w-full flex justify-between items-center mt-2 px-1">
                       {myTime ? (
                           <div className={`font-creative-title text-base md:text-lg font-bold px-3 py-1.5 rounded-xl border transition-all duration-300 ${
                               isMyTurnNow 
                                   ? 'bg-green-500 text-black border-green-400 shadow-[0_0_12px_rgba(34,197,94,0.3)] animate-pulse' 
                                   : 'bg-zinc-800/80 text-zinc-300 border-white/5'
                           }`}>
                               {myTime}
                           </div>
                       ) : (
                           <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider bg-black/40 px-2 py-1 rounded-lg border border-white/5">Unlimited</div>
                       )}
                       
                       {/* Draw Offer Button - ALWAYS visible, premium high-contrast style */}
                       {onOfferDraw && !game.isGameOver() && (
                           <button 
                               onClick={onOfferDraw}
                               className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 hover:text-white border border-white/10 hover:border-white/20 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95 shadow-md"
                           >
                               🤝 Offer Draw
                           </button>
                       )}
                   </div>
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