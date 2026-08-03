# 03 — Architecture
## Project Architecture, Data Flow & Integration Map

> **Version:** 1.0.0 | **Type:** Architecture Reference | **Audience:** Developers joining the project

---

## Table of Contents

1. [Repository Structure](#1-repository-structure)
2. [Full Stack Integration Map](#2-full-stack-integration-map)
3. [Data Flow Diagrams](#3-data-flow-diagrams)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Socket Event Contract](#6-socket-event-contract)
7. [Environment Configuration](#7-environment-configuration)
8. [Deployment Architecture](#8-deployment-architecture)
9. [Local Development Setup](#9-local-development-setup)

---

## 1. Repository Structure

```
Guftaguu/                          ← Monorepo root
├── docs/                          ← 📖 All documentation (this folder)
│   ├── 00_INDEX.md
│   ├── 01_STUDY_NOTES.md
│   ├── 02_SYSTEM_DESIGN.md
│   ├── 03_ARCHITECTURE.md         ← You are here
│   ├── 04_API_REFERENCE.md
│   ├── 05_COMPONENT_GUIDE.md
│   └── 06_FUTURE_ROADMAP.md
│
├── backend/                       ← Node.js Server
│   ├── config/
│   │   └── redis.js               ← Redis client initialization
│   ├── services/
│   │   └── discordLogger.js       ← Discord webhook integration
│   ├── socket/
│   │   ├── index.js               ← Socket.IO server + session manager
│   │   └── handlers/
│   │       ├── matchmaking.js     ← Queue + block logic
│   │       ├── game.js            ← Game event relay
│   │       └── messaging.js       ← Chat + typing + presence
│   ├── index.js                   ← Express bootstrap (entry point)
│   ├── package.json
│   └── .env                       ← REDIS_URL, DISCORD_WEBHOOK_URL
│
├── frontend/                      ← React + Vite SPA
│   ├── public/                    ← Static assets (wallpaper, favicon)
│   ├── src/
│   │   ├── main.jsx               ← React entry, BrowserRouter mount
│   │   ├── App.jsx                ← Route definitions + onboarding flow
│   │   ├── index.css              ← Global styles + design tokens
│   │   ├── App.css                ← App-level styles
│   │   ├── config/
│   │   │   └── pageContent.js     ← Static privacy/terms text
│   │   ├── views/                 ← Full-page screen components
│   │   │   ├── ChatInterface.jsx  ← Main application (socket + UI)
│   │   │   ├── LegalScreen.jsx    ← Terms agreement
│   │   │   ├── NameScreen.jsx     ← Display name entry
│   │   │   └── StaticPage.jsx     ← Policy page renderer
│   │   └── components/            ← Reusable UI building blocks
│   │       ├── ui.jsx             ← GlassCard, GlowButton, CatLogo
│   │       ├── SwipeableMessage.jsx ← Chat bubble with swipe-to-reply
│   │       └── games/             ← Game boards
│   │           ├── GameBoard.jsx  ← Game type router
│   │           ├── TicTacToe.jsx
│   │           ├── Connect4.jsx
│   │           ├── DotsBoxes.jsx
│   │           ├── ChessBoardGame.jsx
│   │           ├── ReactionBoard.jsx
│   │           └── winLogic.js    ← Pure win-check functions
│   ├── package.json
│   └── vite.config.js
│
├── package.json                   ← Root (no scripts — just workspace info)
├── .gitignore
└── README.md
```

---

## 2. Full Stack Integration Map

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React SPA)                                │
│                         Vercel CDN / localhost:5173                              │
│                                                                                  │
│  main.jsx → App.jsx → [step-based routing]                                       │
│                                                                                  │
│  Step 1: LegalScreen ──────── reads PAGE_CONTENT from config/pageContent.js     │
│  Step 2: NameScreen  ──────── writes displayName to localStorage                │
│  Step 3: ChatInterface ──┬─── Socket.IO client (auto-detects localhost vs prod) │
│                          ├─── Views: idle → searching → chatting → ended        │
│                          ├─── GameBoard → TicTacToe / Connect4 / DotsBoxes      │
│                          ├─── ChessBoardGame (chess.js + react-chessboard)      │
│                          ├─── ReactionBoard                                      │
│                          └─── SwipeableMessage (per chat message)               │
└────────────────────────────────┬────────────────────────────────────────────────┘
                                 │
                    WebSocket (wss:// or ws://)
                    HTTP POST /api/report
                                 │
┌────────────────────────────────▼────────────────────────────────────────────────┐
│                           BACKEND (Node.js)                                      │
│                       Render.com / localhost:3001                                │
│                                                                                  │
│  index.js (Express + HTTP server)                                                │
│     ├── POST /api/report ─────── discordLogger.sendReport() ──► Discord Webhook │
│     └── Socket.IO Server ─────── socket/index.js                                │
│              │                                                                   │
│              ├── On 'connection':                                                │
│              │      Identify userId (auth.userId)                                │
│              │      Check reconnection (activeUsers map)                         │
│              │      Auto-rejoin active room if applicable                        │
│              │                                                                   │
│              ├── handlers/matchmaking.js                                         │
│              │      find_match ──────────────────────────────► Redis RPOP queue │
│              │      block_user ─────────────────────────────► Redis SET block   │
│              │                                                                   │
│              ├── handlers/game.js                                                │
│              │      request_game / accept_game / make_move (pure relay)          │
│              │      reaction timing (server-authoritative)                       │
│              │                                                                   │
│              └── handlers/messaging.js                                           │
│                     send_message / typing / leave_room (pure relay)              │
│                     user_status_change (tab visibility tracking)                 │
│                                                                                  │
│  In-memory state (single process):                                               │
│     activeUsers{}    socketUserMap{}    userRooms{}    reactionState{}           │
└─────────────────────────────────────┬───────────────────────────────────────────┘
                                      │
                           ioredis connection (TLS)
                                      │
┌─────────────────────────────────────▼───────────────────────────────────────────┐
│                           REDIS CLOUD                                            │
│                                                                                  │
│  waiting_queue (List)           → Matchmaking queue                              │
│  block:{uid}:{uid} (String+TTL) → Block registry                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow Diagrams

### 3.1 — New User Onboarding Flow

```
Browser opens guftaguu.vercel.app
          │
          ▼
    [Check localStorage]
          │
          ├── No username → LegalScreen → NameScreen → ChatInterface
          │
          └── Username exists → ChatInterface directly
                    │
                    ▼
          Socket connects with auth:
          { userId: localStorage.guftaguu_user_id,
            name: localStorage.guftaguu_username,
            roomId: null }
```

### 3.2 — Matchmaking Flow

```
User A                    Server                    Redis                User B
  │                          │                         │                    │
  │──── find_match ─────────►│                         │                    │
  │                          │──── LREM me ───────────►│                    │
  │                          │◄─── ok ─────────────────│                    │
  │                          │──── RPOP ───────────────►│                    │
  │                          │◄─── User B's userId ─────│                    │
  │                          │    [validate B]           │                    │
  │                          │──── join(room) ──────────────────────────────►│
  │                          │──── join(room) ──────────────────────────────►│
  │                          │    (100ms wait)           │                    │
  │◄─── match_found ─────────│                           │                    │
  │                          │─────────────────────────────── match_found ──►│
  │                          │                           │                    │
  │──── send_name ──────────►│                           │                    │
  │                          │──────────────────────────────── receive_name ►│
```

### 3.3 — Message Flow

```
User A types message                         User B
  │                                             │
  │──── emit('send_message', {roomId, msg}) ───►│ Server
  │                          │                  │
  │                          │── verify room membership
  │                          │── socket.to(roomId).emit('receive_message', msg)
  │                          │                  │
  │                          │                  │◄── receive_message event fires
  │                          │                  │    setMessages([...prev, msg])
  │                          │                  │    UI re-renders
```

### 3.4 — Reconnection Flow

```
User A loses connection                      User B                Server
  │                                             │                     │
  │ [disconnect]                                │                     │
  │                                             │◄── partner_status_change('disconnected')
  │                                             │    [60s timer starts on server]
  │                                             │
  │ [tab refreshes / network recovers]          │
  │                                             │
  │──── io.connect({ auth: { userId, roomId } }) ──────────────────►│
  │                          [server finds activeUsers[userId]]      │
  │                          [clears disconnectTimer]                │
  │                          [socket.join(roomId)]                   │
  │◄──────── rejoined_room { roomId, partnerName } ─────────────────│
  │                                             │◄── partner_status_change('active')
  │ [restore sessionStorage chat history]       │    [partner sees "back online"]
```

### 3.5 — Game Flow

```
User A requests game                         User B
  │                                             │
  │──── emit('request_game', {roomId, 'chess-3'}) ─────────────────►Server
  │                                             │◄── game_requested('chess-3')
  │    [waiting spinner shows]                  │    [game request modal shows]
  │                                             │
  │                                             │──── emit('accept_game', {roomId, 'chess-3'}) ──►Server
  │◄──────── game_start { gameType:'chess-3', starterId: B.socketId } ───────────────────────────►│
  │   [mySymbol='X', isMyTurn=true]             │    [mySymbol='O', isMyTurn=false]
  │                                             │
  │ [User A makes a move]                       │
  │──── emit('make_move', {roomId, extraData: {game:'chess', fen}}) ─►Server
  │                                             │◄── receive_move {extraData}
  │                                             │    [board updates, isMyTurn=true]
```

---

## 4. Frontend Architecture

### Component Hierarchy

```
<BrowserRouter>        (main.jsx)
  └─ <App>             (routing + onboarding state)
       ├─ Route "/"
       │    ├─ <LegalScreen>     (step: 'legal')
       │    ├─ <NameScreen>      (step: 'name')
       │    └─ <ChatInterface>   (step: 'chat')
       │         ├─ <ConnectionStatusBanner>  (local to ChatInterface)
       │         ├─ <header>                  (inline)
       │         ├─ [Modals]                  (game selector, draw offer, report)
       │         ├─ [idle screen]             (inline JSX)
       │         ├─ [searching screen]        (inline JSX)
       │         └─ [chatting/ended screen]
       │              ├─ <ChessBoardGame>     (when gameType.startsWith('chess'))
       │              ├─ <ReactionBoard>      (when gameType === 'reaction')
       │              ├─ <GameBoard>          (all other games)
       │              │    ├─ <TicTacToe>
       │              │    ├─ <Connect4>
       │              │    └─ <DotsBoxes>
       │              └─ [chat panel]
       │                   └─ <SwipeableMessage> × N
       │
       ├─ Route "/privacy"    → <StaticPage title="Privacy Policy">
       ├─ Route "/terms"      → <StaticPage title="Terms of Service">
       └─ Route "/about"      → <StaticPage title="About Guftaguu">
```

### State Ownership Map

```
App.jsx
  step, displayName

ChatInterface.jsx (owns all runtime state)
  ┌── Connection State
  │     isConnected, isReconnecting
  ├── User State
  │     status, roomId, partnerId, partnerName, partnerStatus
  │     idleCount, busyCount
  ├── Chat State
  │     messages, message (input), isPartnerTyping, replyingTo
  ├── Game State
  │     activeGameType, gameActive, board, isMyTurn, mySymbol, gameWinner
  │     chessGameOver, reactionState, reactionResult
  ├── Request State
  │     incomingRequest, waitingForResponse, statusMessage
  │     incomingDrawOffer, drawStatusMessage
  └── UI State
        showGameSelector, chessSubmenu, showReportModal
        reportData, isSendingReport

ChessBoardGame.jsx (owns internal chess state)
  game (chess.js instance), whiteTime, blackTime, promotion modal state

SwipeableMessage.jsx (owns touch gesture state)
  startX, isSwiped, isReplying
```

### Dynamic Server URL Detection

```js
// frontend/src/views/ChatInterface.jsx
const SERVER_URL = window.location.hostname === 'localhost'
    || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'          // Local development
    : 'https://guftaguu-backend.onrender.com';  // Production
```

---

## 5. Backend Architecture

### Handler Registration Pattern

```js
// socket/index.js
io.on('connection', (socket) => {
    // 1. Identify user
    // 2. Handle reconnection
    // 3. Register domain handlers — each gets (io, socket, redis, context)
    registerMatchmakingHandlers(io, socket, redis, context);
    registerGameHandlers(io, socket, redis, context);
    registerMessagingHandlers(io, socket, redis, context);
    // 4. Handle disconnect
});
```

Each handler module receives a **shared context object** — it's passed by reference, so all handlers read and write the same `activeUsers`, `socketUserMap`, `userRooms`, and `reactionState` maps.

### Dependency Flow

```
index.js
  ├── config/redis.js           (creates ioredis client)
  ├── services/discordLogger.js (exports sendReport function)
  └── socket/index.js           (exports initSocketServer)
        ├── socket/handlers/matchmaking.js
        ├── socket/handlers/game.js
        └── socket/handlers/messaging.js
```

---

## 6. Socket Event Contract

### Client → Server Events

| Event | Payload | Handler | Description |
|-------|---------|---------|-------------|
| `find_match` | none | matchmaking.js | Enter matchmaking queue |
| `block_user` | `{ roomId, partnerId }` | matchmaking.js | Block partner for 10 mins |
| `send_name` | `{ roomId, name }` | messaging.js | Share display name |
| `send_message` | `{ roomId, message: { text, replyTo } }` | messaging.js | Send chat message |
| `typing` | `{ roomId, isTyping: boolean }` | messaging.js | Typing indicator |
| `user_status_change` | `{ status: 'active' | 'inactive' }` | messaging.js | Tab visibility |
| `leave_room` | `{ roomId }` | messaging.js | Voluntarily end chat |
| `request_game` | `{ roomId, gameType }` | game.js | Invite partner to play |
| `accept_game` | `{ roomId, gameType }` | game.js | Accept game invitation |
| `decline_game` | `{ roomId }` | game.js | Decline game invitation |
| `make_move` | `{ roomId, index, symbol, gameType?, extraData? }` | game.js | Submit game move |
| `offer_draw` | `{ roomId }` | game.js | Offer chess draw |
| `accept_draw` | `{ roomId }` | game.js | Accept chess draw |
| `decline_draw` | `{ roomId }` | game.js | Decline chess draw |
| `ping` | none | socket/index.js | Heartbeat ping |

### Server → Client Events

| Event | Payload | Trigger | Description |
|-------|---------|---------|-------------|
| `match_found` | `{ roomId, partnerId }` | Successful match | Both users paired |
| `rejoined_room` | `{ roomId, partnerId, partnerName }` | Reconnection | Restored to active room |
| `connection_dead` | none | Stale roomId | Room no longer exists |
| `receive_name` | `name: string` | After `send_name` | Partner's display name |
| `receive_message` | `{ text, replyTo }` | After `send_message` | Chat message delivery |
| `display_typing` | `isTyping: boolean` | After `typing` | Typing indicator |
| `partner_disconnected` | none | Leave / timeout | Partner left permanently |
| `partner_status_change` | `{ status }` | Tab switch / reconnect | Partner online status |
| `site_stats` | `{ idle, total }` | Every 5s broadcast | Live user counts |
| `game_requested` | `gameType: string` | After `request_game` | Game invite received |
| `game_start` | `{ gameType, starterId }` | After `accept_game` | Game begins |
| `game_declined` | none | After `decline_game` | Partner declined |
| `receive_move` | `{ index, symbol, extraData? }` | After `make_move` | Opponent's move |
| `reaction_green_light` | `timestamp` | 5s after reaction start | Go signal |
| `reaction_result` | `{ winnerId, time }` | First click | Reaction winner |
| `draw_offered` | none | After `offer_draw` | Draw offer received |
| `draw_accepted` | none | After `accept_draw` | Draw confirmed |
| `draw_declined` | none | After `decline_draw` | Draw rejected |
| `pong` | none | After `ping` | Heartbeat response |

---

## 7. Environment Configuration

### Backend `.env`
```bash
REDIS_URL=rediss://username:password@host:port  # Redis Cloud TLS URL
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/ID/TOKEN
```

### Frontend Environment (Dynamic)
No `.env` file needed — the server URL is detected at runtime from `window.location.hostname`.

### CORS Configuration
```js
// socket/index.js
cors: {
    origin: [
        "http://localhost:5173",        // Local dev
        "https://guftaguu.vercel.app"   // Production
    ],
    methods: ["GET", "POST"]
}
```

---

## 8. Deployment Architecture

```
                    GitHub (akshaanxh/Guftaguu)
                           │
          ┌────────────────┴───────────────────┐
          │                                     │
          ▼                                     ▼
    Vercel (Auto-deploy)               Render (Auto-deploy)
    frontend/                          backend/
    Global CDN (150+ edge nodes)       Single Node.js instance
    HTTPS: guftaguu.vercel.app         HTTPS: guftaguu-backend.onrender.com
          │                                     │
          │ React SPA (static files)            │ Node.js + Socket.IO
          │                                     │
          └─────── WebSocket (wss://) ─────────┘
                            │
                            ▼
                      Redis Cloud
                   (managed, shared)
```

### Render Deployment Notes
- Free tier: **512MB RAM**, **0.1 CPU**
- Spins down after **15 min of inactivity** → 30s cold start on next request
- In practice, active users keep it warm via `site_stats` 5-second broadcast
- WebSocket connections are **preserved** across Render's proxy (sticky sessions not needed for single instance)

### Vercel Deployment Notes
- Frontend is deployed as **static files** — no serverless functions
- Vite builds to `dist/` — Vercel serves `dist/index.html` for all routes (SPA routing)
- `vercel.json` not required — Vercel auto-detects Vite projects

---

## 9. Local Development Setup

### Prerequisites
```
Node.js >= 18.x
npm >= 9.x
Redis (via Redis Cloud — use REDIS_URL from existing .env)
```

### First-Time Setup
```bash
# Clone
git clone https://github.com/akshaanxh/Guftaguu.git
cd Guftaguu

# Backend
cd backend
npm install
# Create .env with REDIS_URL and DISCORD_WEBHOOK_URL
node index.js

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Verifying Everything Works
1. Open http://localhost:5173 in Browser 1
2. Open http://localhost:5173 in Browser 2 (or Incognito)
3. Accept terms, enter different names on both
4. Click "Start Chatting" on both
5. They should pair instantly — backend logs show:
   ```
   ✅ MATCH FOUND! Pairing user_xxx with user_yyy
   ```
6. Chat messages, typing indicators, and games should all work
