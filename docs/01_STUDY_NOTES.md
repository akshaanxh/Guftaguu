# 01 — Study Notes
## Technologies Studied While Building Guftaguu

> **Purpose:** Documents every core technology, concept, and pattern studied and applied during the development of this project. Serves as a personal engineering knowledge base.

---

## Table of Contents

1. [WebSockets & Socket.IO](#1-websockets--socketio)
2. [Redis — Data Structures & Patterns](#2-redis--data-structures--patterns)
3. [Real-Time Matchmaking Algorithms](#3-real-time-matchmaking-algorithms)
4. [React — State Management Patterns](#4-react--state-management-patterns)
5. [Frontend Architecture & Modularization](#5-frontend-architecture--modularization)
6. [Game Logic Implementation](#6-game-logic-implementation)
7. [Session Persistence & Reconnection](#7-session-persistence--reconnection)
8. [Deployment & DevOps](#8-deployment--devops)
9. [Security Patterns Applied](#9-security-patterns-applied)

---

## 1. WebSockets & Socket.IO

### What We Studied
WebSockets are a persistent, full-duplex communication channel over a single TCP connection. Unlike HTTP (which is request-response and stateless), a WebSocket connection stays **open** — allowing the server to push data to the client at any time without polling.

### How HTTP vs WebSocket Differs
```
HTTP (Poll-based):
  Client → GET /messages → Server
  Client ← 200 OK (data)  ← Server
  (repeat every X seconds)

WebSocket (Push-based):
  Client ↔ [TCP Handshake Upgrade] ↔ Server
  Server → emit('receive_message') → Client   (instant, no request needed)
  Client → emit('send_message')   → Server
```

### Socket.IO Specifics
Socket.IO wraps the native WebSocket API and adds:
- **Automatic reconnection** with exponential back-off
- **Room support** — namespaced broadcast channels
- **Acknowledgements** — emit with callbacks
- **Fallback to HTTP long-polling** when WebSocket isn't available

### How We Applied It
| Feature | Socket.IO Usage |
|---------|----------------|
| Chat messages | `socket.to(roomId).emit('receive_message', ...)` |
| Typing indicators | `socket.to(roomId).emit('display_typing', isTyping)` |
| Game moves relay | `socket.to(roomId).emit('receive_move', {...})` |
| Stats broadcast | `io.emit('site_stats', {...})` — emits to ALL clients |
| Reconnection recovery | `reconnection: true, reconnectionAttempts: 15` |

### Key Configuration Studied
```js
const io = new Server(server, {
    pingTimeout: 60000,    // Marks connection dead after 60s without pong
    pingInterval: 10000,   // Sends a ping packet every 10s
    transports: ['websocket', 'polling'] // Falls back to HTTP polling if WS fails
});
```

---

## 2. Redis — Data Structures & Patterns

### What Is Redis
Redis is an **in-memory key-value store**. Data lives in RAM — making reads/writes extremely fast (~100,000 ops/sec). It supports complex data structures beyond simple key-value, including lists, sets, and sorted sets.

### Data Structures We Used

#### Lists (for the Matchmaking Queue)
```
RPUSH waiting_queue userId    → Add user to the front of queue
RPOP  waiting_queue           → Remove & return last user (FIFO)
LREM  waiting_queue 0 userId  → Remove specific user from queue
```
Redis Lists give O(1) push/pop operations — critical for instant matching.

#### Strings with Expiry (for Block/Cooldown)
```
SET block:userId1:userId2 1 EX 600   → Block for 600 seconds (10 mins)
GET block:userId1:userId2            → Returns "1" if blocked, nil if not
```
The `EX` flag sets automatic expiry — Redis deletes the key automatically after 600s. No background cleanup job needed.

### Why Redis Over In-Memory JS Objects
```
Problem: activeUsers = {} in Node.js is in-process memory.
         If you run 2 backend instances, Instance A's memory is invisible to Instance B.

Redis Fix: Centralized external store — all Node.js instances read from the same Redis.
           This enables horizontal scaling.
```

### Redis Cloud Setup Studied
Used **Redis Cloud** (managed Redis by Redis Labs) to avoid self-hosting Redis. The connection string is provided via `REDIS_URL` environment variable. `ioredis` handles connection pooling, retries, and error recovery automatically.

---

## 3. Real-Time Matchmaking Algorithms

### The Problem
Thousands of users click "Start Chatting". You need to pair them with another online, idle user — in under 1 second — while handling:
- Users who disconnect mid-queue
- Users blocking each other
- Users already in a room (busy users)

### Our Queue-Based Algorithm (FIFO with Validation)
```
1. User clicks "Start Chatting" → emits `find_match`
2. Server removes user from queue (in case of re-search): LREM waiting_queue 0 userId
3. Server pops a candidate from the queue: RPOP waiting_queue
4. Validate the candidate:
   a. Is the candidate the same user? → skip
   b. Is the candidate's socket still connected?  → if not, try next
   c. Is the candidate already in a room (busy)?  → if yes, push back + try next
   d. Did either user block the other?  → if yes, push candidate back + try next
5. If valid → create roomId, join both to Socket.IO room, emit `match_found`
6. If no valid partner → push self to queue, wait
```

### Race Condition Fix
A subtle bug: when two users try to match each other simultaneously, both might pop the other before either has joined the room. We solved this with a 100ms deliberate delay after room creation:
```js
await new Promise(resolve => setTimeout(resolve, 100));
io.to(roomId).emit('match_found', { roomId, partnerId });
```
This gives the `socket.join()` operation time to complete before the event fires.

---

## 4. React — State Management Patterns

### useState vs useRef
A critical React concept studied during this project:

| Hook | Re-renders? | Use When |
|------|-------------|----------|
| `useState` | Yes | UI data that must re-render when changed |
| `useRef` | No | Values inside stale closures, DOM refs, timers |

**The Stale Closure Problem We Hit:**
```jsx
// WRONG: socket handler reads 'roomId' from closure — it's always the initial value!
socket.on('partner_disconnected', () => {
    sessionStorage.removeItem(`chat_${roomId}`); // roomId is stale!
});

// FIX: Use a ref that always points to the latest value
const roomIdRef = useRef(null);
useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

socket.on('partner_disconnected', () => {
    sessionStorage.removeItem(`chat_${roomIdRef.current}`); // Always fresh!
});
```

### useEffect Dependency Arrays
```jsx
useEffect(() => {
    // Runs once (on mount) — empty deps
}, []);

useEffect(() => {
    // Runs every time displayName changes
}, [displayName]);

useEffect(() => {
    // WIN CHECKER — re-evaluates every time board, gameType, or gameActive changes
}, [board, activeGameType, gameActive]);
```

### Component Communication Pattern Used
```
App.jsx (routing controller)
  └─ ChatInterface.jsx (holds ALL socket + game state)
       ├─ GameBoard.jsx → TicTacToe / Connect4 / DotsBoxes (receive state via props)
       ├─ ChessBoardGame.jsx (manages own internal chess timer)
       └─ ReactionBoard.jsx (receives reactionState via props)
```
State flows DOWN via props. Events flow UP via callback props (`onMove`, `onGameEnd`).

---

## 5. Frontend Architecture & Modularization

### The Monolith Problem We Started With
`App.jsx` was ~1,300 lines. A single file contained:
- Routing
- Socket.IO lifecycle
- All chat state
- All game state
- All UI views
- All modal logic

### Modularization Approach Applied
We separated concerns by function type:

```
views/          → Full-screen page-level components
components/     → Reusable UI building blocks
components/games/ → Individual game boards
config/         → Static data / constants
```

**Before:**
```
App.jsx (1300 lines)
GameComponents.jsx (528 lines)
```

**After:**
```
views/
  ChatInterface.jsx     (socket + chat + game orchestration)
  LegalScreen.jsx       (terms agreement)
  NameScreen.jsx        (username entry)
  StaticPage.jsx        (policy rendering)

components/
  ui.jsx                (GlassCard, GlowButton, CatLogo)
  SwipeableMessage.jsx  (touch reply UI)
  games/
    GameBoard.jsx       (router — dispatches to right game)
    TicTacToe.jsx
    Connect4.jsx
    DotsBoxes.jsx
    ChessBoardGame.jsx
    ReactionBoard.jsx
    winLogic.js         (pure functions — no JSX)

config/
  pageContent.js        (static text content)
```

---

## 6. Game Logic Implementation

### Tic-Tac-Toe (Client-Side Win Detection)
Used a **hardcoded winning lines** array — all 8 possible winning combinations on a 3×3 grid. Checked after every move.
```js
const lines = [
    [0,1,2], [3,4,5], [6,7,8],  // rows
    [0,3,6], [1,4,7], [2,5,8],  // cols
    [0,4,8], [2,4,6]             // diagonals
];
```

### Connect 4 (Gravity + 4-Direction Check)
Connect 4 uses a 6×7 grid (42 cells). The "gravity" effect is achieved by finding the **lowest empty row** in a column when a player clicks. Win checking scans in 4 directions: horizontal, vertical, diagonal (↗ and ↘).

### Dots & Boxes (Line-Based Board)
The trickiest game to implement. State is split into:
- `hLines[30]` — 30 horizontal line slots on a 5×5 grid (6 rows × 5 cols)
- `vLines[30]` — 30 vertical line slots (5 rows × 6 cols)
- `boxes[25]` — 25 box ownership markers

A box is "complete" when all 4 surrounding lines are drawn. **Box completion grants the player another turn** — the special rule that drives strategy.

### Chess (chess.js Library)
Chess logic is managed by the `chess.js` library, which:
- Validates legal moves (prevents illegal positions)
- Detects checkmate, stalemate, and draw
- Provides FEN notation (a compact string encoding the full board state)

The entire game state is transmitted as a FEN string via Socket.IO. The `react-chessboard` library renders the board.

### Reaction Game (Server-Authoritative Timing)
The server controls the green light timer to prevent cheating:
1. Server waits 5 seconds after game start
2. Server emits `reaction_green_light` to both players simultaneously
3. First player to emit `make_move` wins
4. Server calculates `Date.now() - state.startTime` for reaction time

Server-side validation prevents clients from faking a fast click time.

---

## 7. Session Persistence & Reconnection

### The Problem
If a user refreshes their browser mid-chat (intentionally or by network hiccup), they lose their match and start over. This is terrible UX.

### Our Solution: Persistent UserId + 60-Second Reconnection Window

```
1. On first visit → generate userId and store in localStorage
   userId = 'user_abc123_1699000000000'

2. On socket connection → pass userId in auth header:
   io('server', { auth: { userId, name, roomId } })

3. Server receives userId → checks activeUsers[userId]:
   → If found AND has roomId → rejoin them to the room
   → Emit 'rejoined_room' to client
   → Emit 'partner_status_change' to partner (they're back!)

4. If user doesn't reconnect within 60 seconds:
   → disconnectTimer fires
   → partner_disconnected emitted to partner
   → Room cleaned up permanently
```

### Chat History Survival
Used `sessionStorage` (persists across same-tab refreshes, cleared on tab close) to store messages per room:
```js
sessionStorage.setItem(`guftaguu_chat_${roomId}`, JSON.stringify(messages));
// On rejoin:
const saved = sessionStorage.getItem(`guftaguu_chat_${roomId}`);
if (saved) setMessages(JSON.parse(saved));
```

---

## 8. Deployment & DevOps

### Deployment Stack Studied
| Service | Role | Why |
|---------|------|-----|
| **Vercel** | Frontend hosting | Auto-deploy from GitHub, global CDN, free tier |
| **Render** | Backend hosting | Free persistent Node.js server, WebSocket support |
| **Redis Cloud** | Managed Redis | Free 30MB tier, no self-hosting, auto-backups |

### Environment Variables
```bash
# backend/.env
REDIS_URL=redis://...           # Redis Cloud connection string
DISCORD_WEBHOOK_URL=https://... # Discord webhook for bug reports
```

### Key Deployment Considerations Learned
1. **CORS:** Backend must explicitly whitelist `https://guftaguu.vercel.app` and `http://localhost:5173`
2. **WebSocket on Render:** Must use `wss://` (secure) for production — Render handles SSL termination automatically
3. **Render Free Tier Spin-Down:** Free Render instances sleep after 15 minutes of inactivity. First request to wake them takes ~30 seconds. Guftaguu stays awake due to periodic `site_stats` pings from active users.

---

## 9. Security Patterns Applied

### Username Impersonation Prevention
```js
// Server-side in messaging.js
if (name === MY_SECRET_KEY) {
    finalName = "👑 Admin";      // Only real admin gets crown
} else if (name.includes("admin") || name.includes("system")) {
    finalName = "⚠️ Imposter";  // Expose imposters publicly
}
```

### Block System (Bidirectional, Time-Limited)
```js
// On block: set TTL key in Redis
redis.set(`block:${myUserId}:${partnerId}`, 1, 'EX', 600); // 10 min block

// On match: check both directions
const [iBlockedThem, theyBlockedMe] = await Promise.all([
    redis.get(`block:${myUserId}:${partnerUserId}`),
    redis.get(`block:${partnerUserId}:${myUserId}`)
]);
if (iBlockedThem || theyBlockedMe) { skip this partner; }
```

### Navigation Guard (Prevent Accidental Disconnect)
```js
window.addEventListener('beforeunload', (e) => {
    if (status === 'chatting') {
        e.preventDefault();
        e.returnValue = "Are you sure? You'll lose your chat.";
    }
});
```

### Room Membership Validation
Before relaying any message, the server verifies the sender is actually in the room:
```js
socket.on('send_message', (data) => {
    if (!socket.rooms.has(data.roomId)) {
        socket.emit('connection_dead'); // Reject unauthorized relay
        return;
    }
    socket.to(data.roomId).emit('receive_message', data.message);
});
```
