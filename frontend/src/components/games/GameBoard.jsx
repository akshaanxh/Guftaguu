import React from 'react';
import TicTacToe from './TicTacToe';
import Connect4 from './Connect4';
import DotsBoxes from './DotsBoxes';

export const GameBoard = ({ gameType, board, onMove, winner, mySymbol, isMyTurn, statusMessage }) => {
    if (gameType === 'dotsboxes') {
        return (
            <DotsBoxes 
                board={board} 
                onMove={onMove} 
                winner={winner} 
                mySymbol={mySymbol} 
                isMyTurn={isMyTurn} 
                statusMessage={statusMessage} 
            />
        );
    }

    if (gameType === 'tictactoe') {
        return (
            <TicTacToe 
                board={board} 
                onMove={onMove} 
                winner={winner} 
                mySymbol={mySymbol} 
                isMyTurn={isMyTurn} 
                statusMessage={statusMessage} 
            />
        );
    }

    if (gameType === 'connect4') {
        return (
            <Connect4 
                board={board} 
                onMove={onMove} 
                winner={winner} 
                mySymbol={mySymbol} 
                isMyTurn={isMyTurn} 
                statusMessage={statusMessage} 
            />
        );
    }

    return null;
};

export default GameBoard;

