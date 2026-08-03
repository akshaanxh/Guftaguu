# 02 — System Design
## High-Level Design (HLD) & Low-Level Design (LLD)

> **Version:** 1.0.0 | **Author:** Guftaguu Engineering | **Status:** Implemented

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Requirements](#2-requirements)
3. [High-Level Design (HLD)](#3-high-level-design-hld)
4. [Low-Level Design (LLD)](#4-low-level-design-lld)
5. [Database Design](#5-database-design)
6. [Concurrency & Race Conditions](#6-concurrency--race-conditions)
7. [Failure Modes & Recovery](#7-failure-modes--recovery)
8. [Current Bottlenecks](#8-current-bottlenecks)

---

## 1. Problem Statement

Build a platform where:
- Any two anonymous users can be instantly paired and chat in real-time
- No user accounts, no message history, no data persistence
- Users can play multiplayer games inside the same session
- If a user briefly disconnects (tab refresh, network hiccup), they should be able to rejoin their active room within 60 seconds without losing their chat partner

---

## 2. Requirements

### Functional Requirements
| # | Requirement |
|---|------------|
| FR-01 | Anonymous matchmaking — pair two idle users in real-time |
| FR-02 | Real-time bidirectional text messaging within a room |
| FR-03 | Typing indicators (show when partner is typing) |
| FR-04 | Display name exchange after pairing |
| FR-05 | User can end chat and find a new match |
| FR-06 | User can block a partner (10-minute cooldown) |
| FR-07 | Partner disconnect/reconnect status notifications |
| FR-08 | Multiplayer games: Tic-Tac-Toe, Connect 4, Dots & Boxes, Chess, Reaction |
| FR-09 | In-game: request, accept, decline game invitations |
| FR-10 | Chess: timed games (3 min blitz, 10 min rapid, unlimited), draw offers |
| FR-11 | Reaction Game: server-authoritative timing, winner detection |
| FR-12 | Bug/feedback reporting via Discord Webhook |
| FR-13 | Live site statistics (users waiting, users in chat) |
| FR-14 | Swipe-to-reply on chat messages |
| FR-15 | Terms of service & privacy policy screens |

### Non-Functional Requirements
| # | Requirement | Target |
|---|------------|--------|
| NFR-01 | Matchmaking latency | < 500ms when partner is available |
| NFR-02 | Message delivery latency | < 100ms (local network) |
| NFR-03 | Reconnection window | 60 seconds |
| NFR-04 | Uptime | 99% (limited by Render free tier) |
| NFR-05 | Zero data persistence | No messages stored server-side |
| NFR-06 | Anonymous | No email, no login, no user tracking |

---

## 3. High-Level Design (HLD)

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS (Browser)                          │
│                                                                   │
│   User A                              User B                     │
│ [React SPA]                        [React SPA]                   │
│ localhost:5173 or guftaguu.vercel.app                            │
└───────────┬───────────────────────────────┬─────────────────────┘
            │ WebSocket (wss://)             │ WebSocket (wss://)
            │                               │
            ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NODE.JS BACKEND SERVER                        │
│                  (Render.com / localhost:3001)                    │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Socket.IO   │  │  Express.js  │  │  In-Memory State     │   │
│  │  Server      │  │  HTTP Layer  │  │  ─────────────────   │   │
│  │              │  │              │  │  activeUsers{}        │   │
│  │  handlers/   │  │  POST        │  │  socketUserMap{}      │   │
│  │  matchmaking │  │  /api/report │  │  userRooms{}          │   │
│  │  game        │  │              │  │  reactionState{}      │   │
│  │  messaging   │  │  GET /       │  │                      │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────┘   │
│         │                 │                                       │
└─────────┼─────────────────┼───────────────────────────────────────┘
          │                 │
          ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│   REDIS CLOUD   │  │  DISCORD WEBHOOK│
│                 │  │                 │
│ waiting_queue   │  │  Bug reports    │
│ block:uid:uid   │  │  (no storage)   │
└─────────────────┘  └─────────────────┘
```

### Component Responsibilities

| Component | Technology | Responsibility |
|-----------|-----------|----------------|
| React SPA | React 18 + Vite | UI rendering, state management, socket client |
| Socket.IO Server | Socket.IO 4.x | Real-time event relay, room management |
| Express.js | Express 5.x | REST HTTP routing (/api/report) |
| Redis Cloud | ioredis + Redis Labs | Matchmaking queue, block keys |
| Discord Webhook | axios HTTP | Bug report forwarding |
| Vercel | CDN + Serverless | Frontend hosting + global edge delivery |
| Render | PaaS | Backend Node.js server hosting |

### Communication Flow

```
MATCHMAKING:
  Client A → emit('find_match')
  Server → pops Redis queue → finds Client B
  Server → join both to Room 'userId_B-userId_A'
  Server → emit('match_found') to both clients

MESSAGING:
  Client A → emit('send_message', {roomId, message})
  Server → socket.to(roomId).emit('receive_message', message)
  Client B ← receives message instantly

GAME MOVE:
  Client A (Player X) → emit('make_move', {roomId, index, symbol})
  Server → socket.to(roomId).emit('receive_move', {index, symbol})
  Client B (Player O) ← applies move to board state
```

---

## 4. Low-Level Design (LLD)

### Backend Module Breakdown

#### `index.js` — Express Bootstrap
```
Responsibilities:
  - Create Express app
  - Mount CORS middleware
  - Mount JSON body parser
  - Create HTTP server
  - Initialize Socket.IO via initSocketServer()
  - Register /api/report POST endpoint
  - Start listening on port 3001

Dependencies:
  → config/redis.js
  → services/discordLogger.js
  → socket/index.js
```

#### `socket/index.js` — Socket Connection Manager
```
Responsibilities:
  - Initialize Socket.IO server with CORS + transport config
  - Maintain shared in-memory state maps:
      activeUsers{}    → userId → { socketId, name, status, disconnectTimer }
      socketUserMap{}  → socket.id → userId
      userRooms{}      → userId → roomId
      reactionState{}  → roomId → { active, startTime, winnerDeclared }
  - Handle connection event:
      → Identify userId from auth headers
      → Check for existing session (reconnection)
      → Auto-rejoin to active room if applicable
  - Handle ping/pong heartbeat
  - Register domain handlers (matchmaking, game, messaging)
  - Handle disconnect event:
      → Start 60-second reconnection timer
      → Notify partner of 'disconnected' status
      → On timer expiry: clean up room state permanently
  - Handle socket-level errors
  - Broadcast site_stats every 5 seconds

State Mutation Rules:
  CREATE: activeUsers[userId] created on first connection
  UPDATE: activeUsers[userId].socketId updated on reconnect
  DELETE: activeUsers[userId] deleted on 60s timeout expiry
  userRooms[userId] created on match_found, deleted on leave/timeout
```

#### `socket/handlers/matchmaking.js` — Queue Logic
```
Events Handled:
  find_match → Queue-based FIFO matching with block validation
  block_user → Store block key in Redis (10 min TTL), clean up room

Matchmaking Algorithm:
  1. LREM self from queue (idempotent)
  2. RPOP candidate from queue
  3. Validate: not self, socket connected, not busy, not blocked (bidirectional)
  4. If valid: create room, join both sockets, emit match_found
  5. If invalid: push candidate back (if active), try next
  6. Max 10 attempts before giving up, push self to queue
  7. 100ms delay before emitting match_found (race condition fix)
```

#### `socket/handlers/game.js` — Game State Relay
```
Events Handled:
  request_game → relay 'game_requested' to partner
  accept_game  → emit 'game_start' to room; init reaction state if needed
  decline_game → relay 'game_declined' to partner
  make_move    → relay to partner (or handle reaction winner)
  offer_draw   → relay 'draw_offered' to partner
  decline_draw → relay 'draw_declined' to partner
  accept_draw  → broadcast 'draw_accepted' to room

Reaction Game Flow:
  accept_game for 'reaction':
    → Init reactionState[roomId]
    → Wait 5000ms (suspense delay)
    → emit 'reaction_green_light' to room
    → Set active = true, record startTime

  make_move for 'reaction':
    → If state.active && !state.winnerDeclared:
        → Mark winnerDeclared = true
        → Calculate time = Date.now() - startTime
        → emit 'reaction_result' { winnerId: socket.id, time }
        → Delete reactionState[roomId]
```

#### `socket/handlers/messaging.js` — Message & Presence
```
Events Handled:
  send_name         → validate username, relay to partner
  send_message      → verify room membership, relay message + replyTo
  user_status_change → update activeUsers status, relay to partner
  typing            → relay isTyping boolean to partner
  leave_room        → emit partner_disconnected, leave Socket.IO room, clean up userRooms

Name Sanitization Rules:
  MY_SECRET_KEY match → "👑 Admin"
  Contains 'admin' / 'system' / 'mod' → "⚠️ Imposter"
  Otherwise → pass through as-is
```

### Frontend Module Breakdown

#### `App.jsx` — Route Controller
```
Responsibilities:
  - Read saved username from localStorage
  - Manage 3-step onboarding flow: legal → name → chat
  - Render background watermark layer
  - Define React Router routes: /, /privacy, /terms, /about

State:
  step: 'legal' | 'name' | 'chat'
  displayName: string
```

#### `views/ChatInterface.jsx` — Core Application Shell
```
Responsibilities:
  - Initialize and manage Socket.IO client lifecycle
  - Maintain all application state (chat + games)
  - Orchestrate game flow (request → accept → play → replay)
  - Render all modal overlays (game selector, draw offer, game request)
  - Render chat message feed with SwipeableMessage
  - Route active game to appropriate game component

Key State:
  status: 'idle' | 'searching' | 'chatting' | 'partner_left' | 'disconnected'
  messages: Message[]
  gameActive: boolean
  activeGameType: string | null
  board: Array | Object (game-specific shape)
  isMyTurn: boolean
  mySymbol: 'X' | 'O' | null

Socket Lifecycle:
  Mount → io.connect()
  Event handlers registered in useEffect([displayName])
  Disconnect cleanup in useEffect([]) return
```

#### `components/games/GameBoard.jsx` — Game Router
```
Props: { gameType, board, onMove, winner, mySymbol, isMyTurn, statusMessage }
Logic: Switch on gameType → render TicTacToe | Connect4 | DotsBoxes
Note: Chess and Reaction are handled directly in ChatInterface (they have unique prop contracts)
```

---

## 5. Database Design

> Guftaguu has **no traditional database**. All storage is ephemeral.

### Redis Schema (Ephemeral)

```
Key Pattern              | Type   | TTL      | Purpose
─────────────────────────────────────────────────────────────────────
waiting_queue            | List   | None     | FIFO matchmaking queue
                         |        |          | Values: userId strings
─────────────────────────────────────────────────────────────────────
block:{uid1}:{uid2}      | String | 600s     | Bidirectional block flag
                         |        |          | Value: "1"
```

### In-Memory Server State (No Persistence)

```
Map             | Key        | Value Shape
────────────────────────────────────────────────────────────────────
activeUsers     | userId     | { socketId, name, status, disconnectTimer }
socketUserMap   | socket.id  | userId
userRooms       | userId     | roomId (format: "uid1-uid2")
reactionState   | roomId     | { active, startTime, winnerDeclared }
```

> ⚠️ **Critical:** All in-memory state is lost on server restart. Redis queue is cleared on every startup intentionally (stale userId references would cause orphaned queue entries).

### Client-Side Storage

```
Storage Type    | Key                          | Value         | Lifespan
────────────────────────────────────────────────────────────────────────────
localStorage    | guftaguu_user_id             | userId string | Permanent (until cleared)
localStorage    | guftaguu_username            | display name  | Until logout
sessionStorage  | guftaguu_chat_{roomId}       | Message[]     | Tab lifetime only
```

---

## 6. Concurrency & Race Conditions

### Race Condition 1: Dual Match
**Problem:** User A and User B both emit `find_match` at the same instant. A pops B from queue, B pops A from queue. Both try to create separate rooms.

**Solution:** The `RPOP` command in Redis is **atomic**. Only one server operation gets the item at a time. Since Node.js is single-threaded, the two `find_match` handlers execute sequentially in the event loop, not simultaneously. One will succeed, one will find an empty queue and push itself.

### Race Condition 2: match_found Before socket.join Completes
**Problem:** `socket.join(roomId)` is async. Emitting `match_found` immediately after may reach clients before the socket is fully in the room, causing the first message to miss.

**Solution:**
```js
await socket.join(roomId);
await partnerSocket.join(roomId);
await new Promise(resolve => setTimeout(resolve, 100)); // Wait for join propagation
io.to(roomId).emit('match_found', {...});
```

### Race Condition 3: Stale Reconnection
**Problem:** User disconnects, partner immediately starts a new match. User reconnects within 60s and gets re-added to old room that no longer has the partner.

**Solution:** On reconnection, server checks `activeUsers[partnerId]` still exists before emitting `rejoined_room`. If partner has left, the reconnecting user gets `connection_dead` and is sent back to the idle screen.

---

## 7. Failure Modes & Recovery

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Client network drop | `disconnect` event + 60s timer | Auto-reconnect; partner waits |
| Server crash | Client `connect_error` after 15 retries | User sees "reconnecting" banner |
| Redis connection lost | ioredis auto-retries with backoff | Matchmaking paused; active chats unaffected |
| Partner tab closed | `disconnect` → 60s timer → `partner_disconnected` | Chat ends, user shown "Find New Match" |
| Stale socket in queue | `partnerSocket` null check in matchmaking | Skip invalid entry, try next |
| Reaction game cheat | Server controls green light timing | Client claim ignored until server authorizes |

---

## 8. Current Bottlenecks

### Single Server Instance
All `activeUsers`, `socketUserMap`, and `userRooms` live in one Node.js process. If a second server instance is added, these maps are not shared — users on different instances cannot be matched.

**Fix (Future):** Redis Pub/Sub adapter for Socket.IO + migrate all state to Redis.

### Memory Growth (No Upper Bound)
`activeUsers` and `userRooms` grow with connected users but are only cleaned up on disconnect. A memory leak could occur if `socketUserMap` entries are orphaned.

**Fix (Future):** Periodic cleanup sweep of `activeUsers` entries whose sockets are no longer in `io.sockets.sockets`.

### No Message Rate Limiting
A single user can flood the `send_message` event with thousands of calls per second, causing unnecessary relay load.

**Fix (Future):** Token bucket rate limiter per socket ID using Redis.
