import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

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

export default ChessBoardGame;
