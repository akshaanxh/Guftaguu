# 07 — Enterprise System Design, Architecture & Components Manual

> **Project Name:** Guftaguu  
> **System Type:** Anonymous Real-Time Matchmaking, Instant Messaging & Multiplayer Game Engine  
> **Version:** 2.0.0 (Polyglot: Node.js & Spring Boot Java Architecture)  
> **Document Status:** Authoritative Production Reference  

---

## Executive Summary

**Guftaguu** is a low-latency, real-time web application designed for anonymous paired communication and synchronized mini-game execution between strangers. The architecture enforces strict zero-data persistence for messages, 60-second reconnection fault resilience, server-authoritative game loops, and bidirectional block enforcement.

This document serves as the high-level and low-level architectural specification, detailing system components across both the **React Frontend**, **Node.js Socket.IO Backend**, and the newly migrated **Spring Boot (Java 17 / Netty-SocketIO) Enterprise Backend**.

---

## Table of Contents

1. [High-Level System Architecture](#1-high-level-system-architecture)
2. [Data & Sequence Flow Architectures](#2-data--sequence-flow-architectures)
3. [Spring Boot Backend Architecture (Java 17)](#3-spring-boot-backend-architecture-java-17)
4. [Node.js Backend Architecture](#4-nodejs-backend-architecture)
5. [Frontend React Architecture](#5-frontend-react-architecture)
6. [Component Library & UI Specifications](#6-component-library--ui-specifications)
7. [Multiplayer Game Engines & State Machines](#7-multiplayer-game-engines--state-machines)
8. [Data Stores & Ephemeral Schema](#8-data-stores--ephemeral-schema)
9. [Security, Rate Limiting & Moderation](#9-security-rate-limiting--moderation)
10. [Deployment & DevOps Infrastructure](#10-deployment--devops-infrastructure)

---

## 1. High-Level System Architecture

```
                                  ┌────────────────────────────────────────────────────────┐
                                  │                     CLIENT LAYER                       │
                                  │                  React 18 + Vite SPA                   │
                                  │       (Vercel Edge CDN / Localhost:5173)               │
                                  └───────────────┬────────────────────────┬───────────────┘
                                                  │                        │
                                  WebSocket (wss://)                      HTTP POST (/api/report)
                                  Port 3001                               Port 3002 / 3001
                                                  │                        │
                                  ┌───────────────▼────────────────────────▼───────────────┐
                                  │                   BACKEND LAYER                        │
                                  │                                                        │
                                  │   ┌────────────────────────────────────────────────┐   │
                                  │   │   Spring Boot 3.2.5 (Java 17 / Netty-SocketIO)  │   │
                                  │   │   OR Node.js 18+ (Socket.IO + Express)          │   │
                                  │   └──────┬─────────────────────────┬───────────────┘   │
                                  │          │                         │                   │
                                  └──────────┼─────────────────────────┼───────────────────┘
                                             │                         │
                                    ioredis / Lettuce (TLS)       WebClient / Axios HTTP
                                             │                         │
                                  ┌──────────▼──────────┐   ┌──────────▼──────────┐
                                  │    REDIS CLOUD      │   │   DISCORD WEBHOOK   │
                                  │                     │   │                     │
                                  │  waiting_queue (L)  │   │  Bug & Report Alerts│
                                  │  block:uid:uid (K)  │   │  (No storage)       │
                                  └─────────────────────┘   └─────────────────────┘
```

---

## 2. Data & Sequence Flow Architectures

### 2.1 — Anonymous Matchmaking Flow (Redis FIFO Queue)

```
Client A (Searching)                 Backend (Spring/Node)              Redis Store                Client B (Searching)
     │                                        │                                │                                │
     │──── emit('find_match') ───────────────►│                                │                                │
     │                                        │─── LREM waiting_queue self ───►│                                │
     │                                        │─── RPOP waiting_queue ────────►│                                │
     │                                        │◄── returns partner (Client B) ─│                                │
     │                                        │                                │                                │
     │                                        ├── Check: B active & connected? │                                │
     │                                        ├── Check: B in room?            │                                │
     │                                        ├── Check: Redis block keys? ───►│                                │
     │                                        │                                │                                │
     │                                        │─── Join Both to Room "B-A" ────────────────────────────────────►│
     │                                        │─── Wait 100ms (Join Sync)      │                                │
     │◄─── emit('match_found') ───────────────│                                │                                │
     │                                        │───────────────────────────── emit('match_found') ──────────────►│
```

---

### 2.2 — Session Disconnection & 60s Grace Window

```
Client A                              Backend Server                         Client B
   │                                         │                                  │
   │─── Network Drop / Refresh ─────────────►│                                  │
   │                                         ├── Set activeUsers[A].status = 'disconnected'
   │                                         ├── Start 60-Second Reconnection Timer
   │                                         │
   │                                         │─── emit('partner_status_change', 'disconnected') ───────────────►│
   │                                         │    (B sees "Partner Disconnected" banner)
   │                                         │
   ├── Scenario 1: A Reconnects <60s ────────┤
   │──── io.connect({auth:{userId}}) ───────►│
   │                                         ├── Cancel Disconnect Timer
   │◄─── emit('rejoined_room') ──────────────│
   │                                         │─── emit('partner_status_change', 'active') ─────────────────────►│
   │                                         │    (B sees "Partner Back Online")
   │                                         │
   └── Scenario 2: Timer Expires (60s) ──────┤
                                             ├── Delete User & Room mappings
                                             │─── emit('partner_disconnected') ────────────────────────────────►│
                                                  (B returned to idle/searching)
```

---

## 3. Spring Boot Backend Architecture (Java 17)

The Java Spring Boot implementation is designed around non-blocking event-driven architectures utilizing **`netty-socketio`** for real-time protocols and **Spring MVC / WebFlux** for REST endpoints.

```
com.guftaguu
├── GuftaguuApplication.java             # Main Application Entry Point (@EnableScheduling)
├── config/
│   ├── AppConfig.java                   # StringRedisTemplate & WebClient Beans
│   └── SocketIOConfig.java              # Netty-SocketIO Configuration Bean (Port 3001, CORS)
├── controller/
│   └── ReportController.java            # REST Controller (Port 3002: GET /, POST /api/report)
├── model/
│   ├── ActiveUser.java                  # User Session State POJO (socketId, name, status, timer)
│   ├── ReactionState.java               # Server-Authoritative Reaction Timing POJO
│   └── ReportRequest.java               # DTO for incoming report requests
├── service/
│   ├── SessionStateService.java         # Thread-Safe ConcurrentHashMap Session Manager
│   └── DiscordService.java              # Async Discord Webhook Dispatcher
└── socket/
    ├── SocketIOServerRunner.java        # Server Lifecycle, Connect/Disconnect, Stats Broadcaster
    └── handler/
        ├── MatchmakingHandler.java      # Redis Queue FIFO Matchmaker & Block Logic
        ├── GameHandler.java             # Multiplayer Move Relays & Reaction Timing Scheduler
        └── MessagingHandler.java        # Chat, Typing Indicators, Status Sync, Sanitization
```

### Core Spring Services & Handlers

#### `SessionStateService.java`
Thread-safe singleton encapsulating four `ConcurrentHashMap` instances:
- `activeUsers`: `userId -> ActiveUser`
- `socketUserMap`: `UUID (SocketID) -> userId`
- `userRooms`: `userId -> roomId`
- `reactionStates`: `roomId -> ReactionState`

#### `SocketIOServerRunner.java`
- Initializes `SocketIOServer` on port `3001`.
- Sanitizes incoming connection query/auth parameters to prevent `null` or `"null"` literal string injection.
- Manages 60-second reconnection timers using `ScheduledExecutorService`.
- Broadcasts platform health metrics (`site_stats`) every 5 seconds.

#### `MatchmakingHandler.java`
- Listens to `find_match`.
- Executes atomic `RPOP` operations on Redis `waiting_queue`.
- Verifies candidate availability, active socket connection, and room state.
- Queries Redis keys `block:{userId}:{partnerId}` in both directions before forming a match.

---

## 4. Node.js Backend Architecture

The Node.js backend serves as a high-performance alternative implementation utilizing Express.js and Socket.IO 4.x.

```
backend/
├── config/
│   └── redis.js                        # ioredis client initialization & startup queue purge
├── services/
│   └── discordLogger.js                # Axios Discord webhook integration
├── socket/
│   ├── index.js                        # Central Socket.IO bootstrapping & connection lifecycle
│   └── handlers/
│       ├── matchmaking.js              # Redis FIFO matching & block handler
│       ├── game.js                     # Multi-game message relay & reaction timer
│       └── messaging.js                # Sanitized text message & presence relay
└── index.js                            # Express HTTP bootstrap (Port 3001)
```

---

## 5. Frontend React Architecture

The frontend is a modern single-page application built on **React 18**, **Vite**, and **Tailwind CSS**, featuring dark glassmorphism design language.

```
frontend/src/
├── main.jsx                            # React entry point, mounting BrowserRouter
├── App.jsx                             # Onboarding step router (Legal -> Name -> Chat)
├── index.css                           # Global design system tokens & glassmorphism utilities
├── config/
│   └── pageContent.js                  # Privacy, Terms, and About static content
├── views/
│   ├── ChatInterface.jsx               # Primary application engine (Sockets, Modals, Feed)
│   ├── LegalScreen.jsx                 # Terms of Service & Privacy agreement view
│   ├── NameScreen.jsx                  # Display name selection view
│   └── StaticPage.jsx                  # Content viewer for policy documents
└── components/
    ├── ui.jsx                          # Reusable UI library (GlassCard, GlowButton, CatLogo)
    ├── SwipeableMessage.jsx            # Touch gesture swipe-to-reply chat bubble
    └── games/
        ├── GameBoard.jsx               # Game type routing component
        ├── TicTacToe.jsx               # 3x3 Grid Game
        ├── Connect4.jsx                # 6x7 Gravity Connect-Four Game
        ├── DotsBoxes.jsx               # Line & Box Ownership Game
        ├── ChessBoardGame.jsx          # Chess engine component (chess.js + timers)
        ├── ReactionBoard.jsx           # Reaction time tester board
        └── winLogic.js                 # Pure win-check evaluation functions
```

---

## 6. Component Library & UI Specifications

### `GlassCard` (`components/ui.jsx`)
A backdrop-filtered container creating the core glass aesthetic.
```jsx
<GlassCard className="p-6 max-w-md">
  {children}
</GlassCard>
```
- **CSS Properties:** `background: rgba(255, 255, 255, 0.03)`, `border: 1px solid rgba(255, 255, 255, 0.07)`, `backdrop-filter: blur(12px)`.

### `GlowButton` (`components/ui.jsx`)
Interactive button with neon illumination effects.
- **Primary Variant:** White background, dark text, white outer glow.
- **Danger Variant:** Red semi-transparent background, red text for destructive actions (Block / Leave).

### `SwipeableMessage` (`components/SwipeableMessage.jsx`)
- Supports touch drag events (`onTouchStart`, `onTouchMove`, `onTouchEnd`).
- Triggers reply handler when swiped > 60px right.
- Displays quoted reply preview above input field when active.

---

## 7. Multiplayer Game Engines & State Machines

### Game Engines Summary

| Game | Evaluation Strategy | Server/Client Responsibility |
|------|--------------------|------------------------------|
| **Tic-Tac-Toe** | Hardcoded 8-line array check | Client evaluates via `winLogic.js`, relays move |
| **Connect 4** | 4-directional 2D array scan | Client evaluates via `winLogic.js`, relays column drop |
| **Dots & Boxes** | Box closure detection loop | Client tracks `hLines[30]`, `vLines[30]`, `boxes[25]` |
| **Chess** | `chess.js` FEN notation validator | Client handles FEN state, timers, and move legality |
| **Reaction Test** | Server timestamp delta (`Date.now() - startTime`) | **Server-Authoritative**: Server fires green light & calculates winner time |

---

## 8. Data Stores & Ephemeral Schema

Guftaguu operates on a **zero persistent database** architecture.

### Redis In-Memory Schema (Upstash / Redis Cloud)

```
Key Pattern             | Type   | TTL     | Description
─────────────────────────────────────────────────────────────────────────────
waiting_queue           | List   | None    | FIFO list storing searching userIds
block:{uid1}:{uid2}     | String | 600s    | 10-minute block key between two users
```

### Client Ephemeral Storage

```
Storage Location | Key                    | Description
─────────────────────────────────────────────────────────────────────────────
localStorage     | guftaguu_user_id       | Permanent unique user ID
localStorage     | guftaguu_username      | User display name
sessionStorage   | guftaguu_chat_{roomId} | Chat feed history (cleared on tab close)
```

---

## 9. Security, Rate Limiting & Moderation

1. **Role Anti-Impersonation:**
   Names containing `admin`, `system`, or `mod` are automatically overridden by the server to `⚠️ Imposter` unless authenticated with `MY_SECRET_KEY` (`👑 Admin`).
2. **Bidirectional Blocking:**
   When User A blocks User B, Redis stores `block:A:B` with a 600-second TTL. The matchmaking algorithm verifies both `block:A:B` and `block:B:A` before pairing.
3. **Room Isolation:**
   Socket.IO verifies that a client is joined to `roomId` before broadcasting messages or game moves to that channel.
4. **XSS Prevention:**
   All rendered chat text is escaped through React JSX default text nodes.

---

## 10. Deployment & DevOps Infrastructure

```
                                  GitHub Repository
                              (akshaanxh/Guftaguu)
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                     │
                    ▼                                     ▼
             Vercel Frontend                       Render Backend
        (guftaguu.vercel.app)                (guftaguu-backend.onrender.com)
        Auto-deployed Vite build             Auto-deployed via render-build.sh
        Global Edge CDN                      Automated JDK 17 & Gradle 8.14
```

### Production Build & Launch Scripts
- **`backend-spring/render-build.sh`**: Downloads OpenJDK 17 and Gradle 8.14 binaries automatically if missing on the build host, then executes `gradle build -x test --no-daemon`.
- **`backend-spring/render-start.sh`**: Configures `JAVA_HOME` and executes `java -jar build/libs/guftaguu-backend-1.0.0.jar`.
