# 05 — Component Guide
## Frontend Component Library & Usage Reference

> **Version:** 1.0.0 | **Framework:** React 18 + Vite | **Styling:** Tailwind CSS (utility classes via index.css)

---

## Table of Contents

1. [Design System](#1-design-system)
2. [Shared UI Components](#2-shared-ui-components)  
3. [View Components](#3-view-components)
4. [Game Components](#4-game-components)
5. [Utility Modules](#5-utility-modules)
6. [Component Props Reference](#6-component-props-reference)

---

## 1. Design System

### Visual Language

Guftaguu uses a **dark glassmorphism** aesthetic with neon accents.

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#0a0a0a` (near-black) | Page background |
| Surface | `rgba(255,255,255,0.03)` | Card backgrounds |
| Border | `rgba(255,255,255,0.07)` | Card borders |
| Accent | White → Zinc gradient | Primary buttons, headings |
| Success | `#22c55e` (green-500) | Online status, match found |
| Warning | `#f59e0b` (amber-500) | Away status, caution |
| Danger | `#ef4444` (red-500) | Disconnect, block |
| Info | `#3b82f6` (blue-400) | Game invitations |

### Typography
- **Primary font:** System sans-serif stack
- **Headings:** Tight tracking (`tracking-tighter`), bold weight
- **Code/stats:** Monospace (`font-mono`)
- **Feature text:** Custom display font via CSS variables

### Glassmorphism Pattern
```css
background: rgba(255, 255, 255, 0.03);
border: 1px solid rgba(255, 255, 255, 0.07);
border-radius: 1.5rem;          /* rounded-3xl */
backdrop-filter: blur(12px);    /* backdrop-blur-xl */
```

### Animation Vocabulary
| Pattern | CSS / Tailwind | Usage |
|---------|---------------|-------|
| Entrance | `animate-in fade-in zoom-in-95 duration-300` | Modals, chat area |
| Slide in | `animate-in slide-in-from-bottom-8 duration-700` | Idle hero screen |
| Ping dot | `animate-ping` | Live status indicators |
| Spin | `animate-spin` | Loading states |
| Pulse | `animate-pulse` | Typing indicator, placeholders |

---

## 2. Shared UI Components

### `GlassCard`
**File:** `frontend/src/components/ui.jsx`

A frosted-glass card container. The primary surface for all modal overlays and panels.

```jsx
import { GlassCard } from '../components/ui';

<GlassCard className="p-6 max-w-md">
    <h3>Title</h3>
    <p>Content goes here</p>
</GlassCard>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `''` | Additional Tailwind classes |
| `children` | `ReactNode` | — | Card content |
| `...rest` | `HTMLDivAttributes` | — | Passed to the root `<div>` |

**Renders:**
```html
<div class="bg-white/[0.03] border border-white/[0.07] rounded-3xl backdrop-blur-xl shadow-2xl {className}">
  {children}
</div>
```

---

### `GlowButton`
**File:** `frontend/src/components/ui.jsx`

Primary call-to-action button with a white glow effect.

```jsx
import { GlowButton } from '../components/ui';

<GlowButton onClick={handleStartChat}>
    Start Chatting →
</GlowButton>

// Danger variant
<GlowButton variant="danger" onClick={handleBlock}>
    Block User
</GlowButton>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'danger'` | `'primary'` | Color theme |
| `className` | `string` | `''` | Additional Tailwind classes |
| `children` | `ReactNode` | — | Button label |
| `onClick` | `() => void` | — | Click handler |
| `disabled` | `boolean` | `false` | Disabled state |
| `...rest` | `ButtonHTMLAttributes` | — | Passed to `<button>` |

**Variants:**
```
primary: white background, black text, white glow on hover
danger:  red-500/10 background, red-400 text, red border
```

---

### `CatLogo`
**File:** `frontend/src/components/ui.jsx`

The Guftaguu brand logo — a cat SVG icon.

```jsx
import { CatLogo } from '../components/ui';

<CatLogo className="w-10 h-10" />
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `''` | Size and positioning classes |

---

### `SwipeableMessage`
**File:** `frontend/src/components/SwipeableMessage.jsx`

A chat bubble component that supports swipe-to-reply gesture on touch devices, and a reply button click on desktop.

```jsx
import { SwipeableMessage } from '../components/SwipeableMessage';

<SwipeableMessage 
    msg={{ text: 'Hello!', sender: 'me', replyTo: null }}
    onReply={(msg) => setReplyingTo(msg)}
/>
```

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `msg` | `Message` | Yes | The message object to render |
| `onReply` | `(msg: Message) => void` | Yes | Called when user initiates a reply |

**Message Shape:**
```ts
{
  text: string;
  sender: 'me' | 'stranger';
  replyTo: Message | null;
}
```

**Behavior:**
- **Desktop:** Shows a reply button (↩) on hover
- **Touch:** Right swipe on "stranger" messages triggers reply; left swipe on "me" messages triggers reply
- Swipe threshold: 60px
- Shows the quoted message above the reply input

**Styling:**
```
sender === 'me'        → Right-aligned, white background, black text
sender === 'stranger'  → Left-aligned, dark glass background, white text
```

---

## 3. View Components

### `LegalScreen`
**File:** `frontend/src/views/LegalScreen.jsx`

Full-screen legal agreement view shown on first visit. User must actively accept terms before proceeding.

```jsx
import LegalScreen from './views/LegalScreen';

<LegalScreen onAgree={() => setStep('name')} />
```

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onAgree` | `() => void` | Yes | Called when user clicks "I Agree & Continue" |

**Features:**
- Displays Privacy Policy and Terms of Service summary
- Links to `/privacy` and `/terms` full-text pages
- "I Agree & Continue" button is the only exit path
- Animated entrance (fade + slide)

---

### `NameScreen`
**File:** `frontend/src/views/NameScreen.jsx`

Display name selection screen. Shown after legal agreement.

```jsx
import NameScreen from './views/NameScreen';

<NameScreen onStart={(name) => {
    localStorage.setItem('guftaguu_username', name);
    setDisplayName(name);
    setStep('chat');
}} />
```

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onStart` | `(name: string) => void` | Yes | Called with chosen display name on submit |

**Validation:**
- Name must be non-empty
- Name must be ≤ 20 characters
- Trimmed before submission

---

### `ChatInterface`
**File:** `frontend/src/views/ChatInterface.jsx`

The main application shell. Owns all socket connections, chat state, and game state. Renders the full UI for all chat phases.

```jsx
import ChatInterface from './views/ChatInterface';

<ChatInterface 
    displayName="Alex"
    onLogout={() => setStep('name')}
/>
```

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `displayName` | `string` | Yes | User's chosen display name |
| `onLogout` | `() => void` | Yes | Called when user clicks "Exit" button |

**Internal Phases:**
```
status === 'idle'          → Hero landing screen with "Start Chatting" CTA
status === 'searching'     → Spinning match-finding animation
status === 'chatting'      → Full chat + optional game panel
status === 'partner_left'  → Chat ended — "Find New Match" option
status === 'disconnected'  → User left — "Find New Match" option
```

**Connection Detection:**
```js
const SERVER_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://guftaguu-backend.onrender.com';
```

---

### `StaticPage`
**File:** `frontend/src/views/StaticPage.jsx`

Generic full-screen page renderer for legal and about content.

```jsx
import StaticPage from './views/StaticPage';
import { PAGE_CONTENT } from '../config/pageContent';

<StaticPage 
    title="Privacy Policy"
    content={PAGE_CONTENT.privacy}
/>
```

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | Yes | Page heading |
| `content` | `string` | Yes | Markdown-ish text content (newlines → paragraphs) |

**Features:**
- Back button (links to `/`)
- Styled scrollable content area
- Glass card layout

---

## 4. Game Components

### `GameBoard`
**File:** `frontend/src/components/games/GameBoard.jsx`

Router component — dispatches the correct game component based on `gameType`.

```jsx
import { GameBoard } from '../components/games/GameBoard';

<GameBoard
    gameType="tictactoe"
    board={Array(9).fill(null)}
    onMove={(index) => handleGameMove(index)}
    winner={null}
    mySymbol="X"
    isMyTurn={true}
    statusMessage=""
/>
```

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `gameType` | `'tictactoe' \| 'connect4' \| 'dotsboxes'` | Yes | Which game to render |
| `board` | `Array \| object` | Yes | Current board state |
| `onMove` | `(move: any) => void` | Yes | Called when player makes a move |
| `winner` | `string \| null` | Yes | Winner symbol, `'draw'`, or `null` |
| `mySymbol` | `'X' \| 'O'` | Yes | Current player's symbol |
| `isMyTurn` | `boolean` | Yes | Whether player can interact |
| `statusMessage` | `string` | No | Status text overlay |

**Note:** Chess and Reaction are NOT routed through `GameBoard` — they are rendered directly in `ChatInterface` due to their unique prop contracts.

---

### `TicTacToe`
**File:** `frontend/src/components/games/TicTacToe.jsx`

3×3 Tic-Tac-Toe board.

**Board State:** `Array(9)` — each cell is `'X'`, `'O'`, or `null`.

**onMove signature:** `(index: number) => void` — the clicked cell index (0–8).

```jsx
<TicTacToe
    board={board}        // Array(9)
    onMove={onMove}      // (index: number) => void
    winner={winner}      // 'X' | 'O' | 'draw' | null
    mySymbol={mySymbol}  // 'X' | 'O'
    isMyTurn={isMyTurn}  // boolean
/>
```

**Visual States:**
- Empty cell: Hover shows faint symbol preview
- Filled cell: Shows 'X' (red) or 'O' (blue)
- Winner line: Highlighted cells
- Disabled: `isMyTurn === false` or cell already filled

---

### `Connect4`
**File:** `frontend/src/components/games/Connect4.jsx`

6×7 Connect 4 board with gravity simulation.

**Board State:** `Array(42)` — row-major order (index 0 = top-left, index 41 = bottom-right).

**onMove signature:** `(colIndex: number) => void` — the clicked column (0–6). Component finds lowest empty row internally.

```jsx
<Connect4
    board={board}        // Array(42)
    onMove={onMove}      // (colIndex: number) => void
    winner={winner}
    mySymbol={mySymbol}
    isMyTurn={isMyTurn}
/>
```

**Visual States:**
- Empty cell: Dark circle
- 'X' cell: Red disc with glow
- 'O' cell: Yellow disc with glow
- Column hover: Arrow indicator on top

---

### `DotsBoxes`
**File:** `frontend/src/components/games/DotsBoxes.jsx`

5×5 Dots & Boxes game with line-drawing mechanics.

**Board State:**
```ts
{
  hLines: boolean[],           // [30] horizontal lines
  vLines: boolean[],           // [30] vertical lines
  boxes: ('X' | 'O' | null)[] // [25] box ownership
}
```

**onMove signature:** `({ type: 'h' | 'v', index: number }) => void`

```jsx
<DotsBoxes
    board={board}
    onMove={onMove}
    winner={winner}
    mySymbol={mySymbol}
    isMyTurn={isMyTurn}
/>
```

**Visual States:**
- Undrawn line: Faint dashed on hover
- Drawn line: Solid white
- Completed box: Filled with player color (red = X, blue = O)
- Score display: Shows box counts for both players

**Special Rule:** Completing a box grants the player another turn.

---

### `ChessBoardGame`
**File:** `frontend/src/components/games/ChessBoardGame.jsx`

Full chess game component with timer, move validation, and draw management.

```jsx
<ChessBoardGame
    gameState={board}           // ChessGameState object
    onMove={handleGameMove}     // (newGameState: ChessGameState) => void
    mySymbol={mySymbol}         // 'X' = White, 'O' = Black
    isMyTurn={isMyTurn}
    statusMessage={statusMessage}
    onGameEnd={(winner) => setChessGameOver(winner)}
    onOfferDraw={() => getSocket().emit('offer_draw', { roomId })}
    drawStatusMessage={drawStatusMessage}
/>
```

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `gameState` | `ChessGameState` | Yes | Current board state including FEN and timers |
| `onMove` | `(state: ChessGameState) => void` | Yes | Called after legal move made |
| `mySymbol` | `'X' \| 'O'` | Yes | X = White pieces, O = Black pieces |
| `isMyTurn` | `boolean` | Yes | Whether player can make a move |
| `onGameEnd` | `(result: string) => void` | Yes | Called with `'me'`, `'opponent'`, or `'draw'` |
| `onOfferDraw` | `() => void` | Yes | Called when player clicks "Offer Draw" |
| `drawStatusMessage` | `string` | No | Status text for draw offer state |

**Internal State:**
- `game` — `chess.js` Chess instance
- `whiteTime`, `blackTime` — Countdown timers (null = unlimited)
- `pendingPromotion` — Stores pawn promotion selection state

**Timer Logic:**
- Timer decrements for the player whose turn it is
- Checked every 1 second via `setInterval`
- On timeout: `onGameEnd('my_timeout')` or `onGameEnd('opponent_timeout')`

**Dependencies:** `chess.js`, `react-chessboard`

---

### `ReactionBoard`
**File:** `frontend/src/components/games/ReactionBoard.jsx`

Reaction speed test game UI.

```jsx
<ReactionBoard
    onClick={handleReactionClick}
    gameState={reactionState}    // 'waiting' | 'ready' | 'clicked'
    result={reactionResult}      // { winner: 'me'|'opponent', time: ms } | null
/>
```

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onClick` | `() => void` | Yes | Called when player taps the board |
| `gameState` | `'waiting' \| 'ready' \| 'clicked'` | Yes | Current reaction phase |
| `result` | `ReactionResult \| null` | No | Game result object |

**Phases:**
```
'waiting' → Red background, "Get Ready..." text, 5s server delay
'ready'   → Green background, "CLICK NOW!" text — click as fast as possible
'clicked' → Grey, "Waiting for result..." text
result    → Show winner and reaction time in ms
```

---

## 5. Utility Modules

### `config/pageContent.js`
**File:** `frontend/src/config/pageContent.js`

Exports static text content for legal and about pages.

```js
import { PAGE_CONTENT } from '../config/pageContent';

PAGE_CONTENT.privacy  // Privacy Policy text
PAGE_CONTENT.terms    // Terms of Service text
PAGE_CONTENT.about    // About page text
```

---

### `components/games/winLogic.js`
**File:** `frontend/src/components/games/winLogic.js`

Pure functions for win detection — no side effects, no state.

```js
import { checkTicTacToeWinner, checkConnect4Winner, checkDotsBoxesWinner } 
    from '../components/games/winLogic';

// Returns: 'X' | 'O' | 'draw' | null
checkTicTacToeWinner(board);   // board: Array(9)
checkConnect4Winner(board);    // board: Array(42)
checkDotsBoxesWinner(board);   // board: DotsBoxesBoard
```

**Function Signatures:**
```ts
function checkTicTacToeWinner(squares: (string | null)[]): string | null;
function checkConnect4Winner(board: (string | null)[]): string | null;
function checkDotsBoxesWinner(board: DotsBoxesBoard): string | null;
```

**Win Detection Algorithms:**
| Game | Algorithm | Complexity |
|------|-----------|------------|
| Tic-Tac-Toe | Check 8 hardcoded winning lines | O(1) |
| Connect 4 | Scan 4 directions (H, V, ↗, ↘) | O(rows × cols) |
| Dots & Boxes | Count X vs O boxes when all 25 filled | O(25) |

---

## 6. Component Props Reference

Quick reference table for all exported components.

| Component | File | Key Props |
|-----------|------|-----------|
| `GlassCard` | `components/ui.jsx` | `className`, `children` |
| `GlowButton` | `components/ui.jsx` | `variant`, `onClick`, `disabled`, `children` |
| `CatLogo` | `components/ui.jsx` | `className` |
| `SwipeableMessage` | `components/SwipeableMessage.jsx` | `msg`, `onReply` |
| `LegalScreen` | `views/LegalScreen.jsx` | `onAgree` |
| `NameScreen` | `views/NameScreen.jsx` | `onStart` |
| `ChatInterface` | `views/ChatInterface.jsx` | `displayName`, `onLogout` |
| `StaticPage` | `views/StaticPage.jsx` | `title`, `content` |
| `GameBoard` | `components/games/GameBoard.jsx` | `gameType`, `board`, `onMove`, `winner`, `mySymbol`, `isMyTurn` |
| `TicTacToe` | `components/games/TicTacToe.jsx` | `board`, `onMove`, `winner`, `mySymbol`, `isMyTurn` |
| `Connect4` | `components/games/Connect4.jsx` | `board`, `onMove`, `winner`, `mySymbol`, `isMyTurn` |
| `DotsBoxes` | `components/games/DotsBoxes.jsx` | `board`, `onMove`, `winner`, `mySymbol`, `isMyTurn` |
| `ChessBoardGame` | `components/games/ChessBoardGame.jsx` | `gameState`, `onMove`, `mySymbol`, `isMyTurn`, `onGameEnd`, `onOfferDraw` |
| `ReactionBoard` | `components/games/ReactionBoard.jsx` | `onClick`, `gameState`, `result` |
