export const checkTicTacToeWinner = (squares) => {
    if (!Array.isArray(squares)) return null;
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Horizontal
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Vertical
        [0, 4, 8], [2, 4, 6]             // Diagonal
    ];
    for (let i = 0; i < lines.length; i++) {
        const [a, b, c] = lines[i];
        if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
            return squares[a];
        }
    }
    if (squares.filter(x => x === null).length === 0) return 'draw';
    return null;
};

export const checkConnect4Winner = (board) => {
    if (!Array.isArray(board)) return null;
    const rows = 6; 
    const cols = 7;

    // Horizontal check
    for (let r = 0; r < rows; r++) { 
        for (let c = 0; c < cols - 3; c++) { 
            const i = r * cols + c; 
            if (board[i] && board[i] === board[i+1] && board[i] === board[i+2] && board[i] === board[i+3]) {
                return board[i]; 
            }
        } 
    }

    // Vertical check
    for (let r = 0; r < rows - 3; r++) { 
        for (let c = 0; c < cols; c++) { 
            const i = r * cols + c; 
            if (board[i] && board[i] === board[i+cols] && board[i] === board[i+cols*2] && board[i] === board[i+cols*3]) {
                return board[i]; 
            }
        } 
    }

    // Diagonal check (bottom-left to top-right)
    for (let r = 3; r < rows; r++) { 
        for (let c = 0; c < cols - 3; c++) { 
            const i = r * cols + c; 
            if (board[i] && board[i] === board[i-cols+1] && board[i] === board[i-cols*2+2] && board[i] === board[i-cols*3+3]) {
                return board[i]; 
            }
        } 
    }

    // Diagonal check (top-left to bottom-right)
    for (let r = 0; r < rows - 3; r++) { 
        for (let c = 0; c < cols - 3; c++) { 
            const i = r * cols + c; 
            if (board[i] && board[i] === board[i+cols+1] && board[i] === board[i+cols*2+2] && board[i] === board[i+cols*3+3]) {
                return board[i]; 
            }
        } 
    }

    return null;
};

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
