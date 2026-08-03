# 06 — Future Roadmap
## Planned Features, Technical Upgrades & Engineering Milestones

> **Version:** 1.0.0 | **Owner:** Guftaguu Engineering | **Review Cycle:** Monthly

---

## Table of Contents

1. [Roadmap Overview](#1-roadmap-overview)
2. [Phase 1 — Stability & Scale](#2-phase-1--stability--scale)
3. [Phase 2 — Product Expansion](#3-phase-2--product-expansion)
4. [Phase 3 — Infrastructure Upgrade (20 LPA+ Engineering)](#4-phase-3--infrastructure-upgrade-20-lpa-engineering)
5. [Phase 4 — Monetization & Growth](#5-phase-4--monetization--growth)
6. [Technical Debt Log](#6-technical-debt-log)
7. [Backlog (Unplanned)](#7-backlog-unplanned)

---

## 1. Roadmap Overview

```
Current State (v1.0)
   └── Single-server Node.js
   └── Redis queue (single instance)
   └── 5 mini-games
   └── Anonymous chat
   └── Basic moderation (block, report)

Phase 1: Stability & Scale        → Estimated: Q3 2026
Phase 2: Product Expansion        → Estimated: Q4 2026
Phase 3: Infrastructure Upgrade   → Estimated: Q1 2027
Phase 4: Monetization & Growth    → Estimated: Q2 2027
```

**Priority System:**
- 🔴 **Critical** — Must do. Blocks scale or has bugs.
- 🟡 **High** — Significant UX or engineering value.
- 🟢 **Medium** — Nice to have, planned.
- ⚪ **Low** — Backlog, no ETA.

---

## 2. Phase 1 — Stability & Scale

### 1.1 🔴 Rate Limiting on Socket Events

**Problem:** A malicious user can flood the server with `send_message` or `find_match` events, causing CPU spikes.

**Solution:** Implement a **sliding window rate limiter** per socket ID using Redis:

```
Algorithm: Sliding Window Counter
Limit:
  - send_message: 20 messages / 10 seconds
  - find_match: 5 requests / 30 seconds
  - make_move: 30 moves / 10 seconds

Implementation:
  Redis key: rate:{socketId}:{event}
  INCR the key on each event
  EXPIRE the key for the window duration
  If count > limit → drop event, emit 'rate_limited' warning
```

**Files to modify:**
- `backend/socket/handlers/messaging.js` — add rate check before `send_message` relay
- `backend/socket/handlers/matchmaking.js` — add rate check before `find_match` queue entry
- New: `backend/middleware/rateLimit.js`

---

### 1.2 🔴 Automated E2E Testing Suite

**Problem:** No automated tests exist. Every code change is a risk.

**Solution:** Write Playwright E2E tests simulating real multi-user flows.

```
Test Cases to Write:
  TC-001: Basic matchmaking — two browsers pair successfully
  TC-002: Message delivery — message from A appears in B's chat
  TC-003: Typing indicator — A types → B sees typing bubble
  TC-004: Game request flow — A requests Tic-Tac-Toe → B accepts → board renders
  TC-005: Reconnection — A refreshes tab mid-chat → A rejoins room within 60s
  TC-006: Block user — A blocks B → neither can match with each other
  TC-007: Chat ends — A clicks Stop → B sees "Partner disconnected"

Tech Stack:
  - Playwright (multi-browser, multi-tab support)
  - @playwright/test runner
  - GitHub Actions CI integration

Run command:
  npx playwright test
```

---

### 1.3 🟡 Mobile UI Overhaul

**Problem:** Mobile users can't play games (layout breaks). This is documented in the live site.

**Solution:** Redesign game boards to be responsive-first:

```
Changes Required:
  - Connect4: Reduce grid to 5×6 on mobile, add horizontal scroll
  - Chess: Use react-chessboard's responsive props (boardWidth based on window.innerWidth)
  - DotsBoxes: Scale down dot grid on screens < 400px
  - ChatInterface: Stack game panel ABOVE chat on mobile instead of side-by-side
  - Add pinch-to-zoom on chess board

CSS Breakpoints to Add:
  @media (max-width: 640px) { /* game board overrides */ }
```

---

### 1.4 🟡 Input Validation & Schema Enforcement

**Problem:** Socket event payloads are not validated. A malformed `make_move` payload can cause runtime errors.

**Solution:** Add Zod schema validation on every incoming socket event:

```js
// Example: validate make_move payload
const MakeMoveSchema = z.object({
    roomId: z.string().min(1),
    index: z.number().int().min(0),
    symbol: z.enum(['X', 'O', 'click']),
    gameType: z.string().optional(),
    extraData: z.object({}).passthrough().optional()
});

socket.on('make_move', (data) => {
    const result = MakeMoveSchema.safeParse(data);
    if (!result.success) return; // Silently reject bad data
    // ...proceed
});
```

---

### 1.5 🟡 Structured Logging

**Problem:** Server logs are raw `console.log` strings — impossible to search or alert on in production.

**Solution:** Replace all `console.log` with structured JSON logger (Winston or Pino):

```json
{
  "level": "info",
  "timestamp": "2026-07-01T14:32:00Z",
  "event": "match_found",
  "userId": "user_abc",
  "partnerId": "user_xyz",
  "roomId": "user_xyz-user_abc",
  "latency_ms": 12
}
```

This enables log aggregation in tools like **Datadog**, **Grafana Loki**, or **Papertrail**.

---

## 3. Phase 2 — Product Expansion

### 2.1 🟡 New Mini-Game: Word Guess (Wordle-Style)

**Concept:** Both players guess the same random word. First to solve in fewer attempts wins.

```
Game Flow:
  1. Server picks a random 5-letter word from a dictionary
  2. Both players guess simultaneously (independent boards)
  3. Server validates guesses and returns colour hints (correct / wrong position / absent)
  4. First to solve in fewer guesses wins
  5. If tie → fewer attempts wins; if same → draw

Technical Notes:
  - Word list stored server-side (prevent cheating)
  - New socket events: 'guess_word', 'receive_guess_result'
  - New component: WordGuessBoard.jsx
```

---

### 2.2 🟡 New Mini-Game: Rock Paper Scissors (Best of 5)

**Concept:** Classic RPS, played as best-of-5 rounds.

```
Game Flow:
  1. Both players select simultaneously (hidden from each other)
  2. Server reveals both choices after both submitted
  3. Round winner determined server-side
  4. First to 3 round wins wins the match

Technical Notes:
  - Server holds choices until both submitted (prevent cheating by seeing first)
  - New socket events: 'rps_choose', 'rps_reveal'
  - New component: RPSBoard.jsx
```

---

### 2.3 🟢 Interest-Based Matchmaking

**Concept:** Allow users to optionally tag interests (Gaming, Music, Tech, etc.) and prefer partners with matching interests.

```
Algorithm Enhancement:
  1. User selects up to 3 interest tags on NameScreen
  2. Tags stored in activeUsers[userId].interests = ['gaming', 'tech']
  3. Matchmaking first attempts to match by shared interests
  4. If no matching partner in 15s → fall back to random match

Redis Schema Addition:
  interest_queue:{tag} → List of userIds interested in that tag
  (e.g., interest_queue:gaming → ['user_abc', 'user_xyz'])
```

---

### 2.4 🟢 Voice Notes (Short Audio Messages)

**Concept:** Allow users to record and send short (max 10s) voice clips via the MediaRecorder API.

```
Implementation:
  Frontend: MediaRecorder API → Blob → Base64 encode (for short clips)
  Socket: emit('send_voice', { roomId, audioBase64 })
  Partner: decode Base64 → play via Web Audio API

Limitations:
  - Max clip length: 10 seconds (keep payload small)
  - No server storage — audio transmitted directly like a message
```

---

### 2.5 🟢 Reaction Emoji System

**Concept:** Double-tap a message to react with an emoji (❤️, 😂, 😮, 👍).

```
UI Flow:
  Double-tap message → emoji picker appears
  User selects emoji → reaction appended to that message
  Partner sees reaction in real-time

Technical Notes:
  - New socket event: emit('react_message', { roomId, messageIndex, emoji })
  - Messages need stable IDs (currently they don't have them)
  - Requires adding message ID generation before sending
```

---

## 4. Phase 3 — Infrastructure Upgrade (20 LPA+ Engineering)

### 3.1 🔴 Horizontal Scaling with Redis Pub/Sub Adapter

**Problem:** Single Node.js server — cannot horizontally scale. One instance limits concurrent users.

**Solution:** Socket.IO Redis Adapter — allows multiple Node.js instances to share socket events.

```
Architecture Change:
  BEFORE:
    Client A → Server 1 (knows about all rooms)
    Client B → Server 1 (same process, same memory)

  AFTER:
    Client A → Server 1
    Client B → Server 2
    Server 1 ← Redis Pub/Sub → Server 2
    (Both servers subscribe to room events via Redis channels)

Implementation:
  npm install @socket.io/redis-adapter

  const { createAdapter } = require('@socket.io/redis-adapter');
  const pubClient = new Redis(REDIS_URL);
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

State Migration:
  activeUsers{}    → Redis Hash (hset/hget)
  socketUserMap{}  → Redis Hash
  userRooms{}      → Redis Hash
  reactionState{}  → Redis Hash with TTL

Load Balancer: Nginx or AWS ALB with WebSocket support (sticky sessions NOT needed with Redis adapter)
```

**Resume Value:** *"Architected a horizontally scalable WebSocket cluster using Socket.IO Redis Pub/Sub adapter, enabling multi-instance deployment behind a load balancer."*

---

### 3.2 🔴 WebRTC Peer-to-Peer Video/Audio

**Problem:** No video or audio chat. Only text and games.

**Solution:** WebRTC for direct peer-to-peer audio/video streaming.

```
Signaling Architecture:
  Client A                   Server (Socket.IO)                  Client B
     │──── rtc_offer (SDP) ────►│                                    │
     │                          │──────── rtc_offer ───────────────► │
     │                          │◄─────── rtc_answer ──────────────  │
     │◄─── rtc_answer ──────────│                                    │
     │──── ice_candidate ──────►│──────── ice_candidate ──────────► │
     │ [direct P2P connection established — server not involved]

TURN Server (for strict NAT):
  - Self-host Coturn (open-source) on a cheap VPS
  - Or use Twilio STUN/TURN (free tier available)

Socket Events to Add:
  'rtc_offer'     → relay SDP offer to partner
  'rtc_answer'    → relay SDP answer to partner
  'ice_candidate' → relay ICE candidates
  'call_end'      → close WebRTC connection

Frontend:
  - getUserMedia() for camera/mic access
  - RTCPeerConnection for connection management
  - New component: VideoCallOverlay.jsx
```

**Resume Value:** *"Implemented WebRTC peer-to-peer video streaming with ICE/STUN NAT traversal for anonymous video chat between strangers."*

---

### 3.3 🟡 Prometheus + Grafana Observability

**Problem:** No metrics on latency, errors, or capacity.

**Solution:** Instrument backend with Prometheus metrics, visualize in Grafana.

```
Metrics to Track:
  guftaguu_active_connections          (Gauge)   → Live socket connections
  guftaguu_matchmaking_queue_size      (Gauge)   → Users waiting
  guftaguu_match_duration_seconds      (Histogram) → Time to find a match
  guftaguu_message_relay_total         (Counter) → Total messages relayed
  guftaguu_game_starts_total           (Counter) → Games started, by type
  guftaguu_reconnections_total         (Counter) → Successful reconnections
  guftaguu_redis_errors_total          (Counter) → Redis failures

Implementation:
  npm install prom-client

  const { register, Gauge } = require('prom-client');
  app.get('/metrics', async (req, res) => {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
  });

Grafana Dashboard:
  - Live connection graph
  - Match success rate panel
  - Game popularity breakdown
  - Redis error alert
```

**Resume Value:** *"Achieved full system observability by instrumenting backend with Prometheus metrics and real-time Grafana dashboards tracking connection health and matchmaking KPIs."*

---

### 3.4 🟡 CI/CD Pipeline with GitHub Actions

**Problem:** Deployment is manual. No automated testing before merge.

**Solution:** GitHub Actions workflow for automated test → build → deploy pipeline.

```yaml
# .github/workflows/deploy.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: cd frontend && npm ci
      - name: Run Playwright E2E tests
        run: npx playwright test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build frontend
        run: cd frontend && npm run build
      - name: Build Docker image
        run: docker build -t guftaguu-backend ./backend

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Render
        run: curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}
```

**Resume Value:** *"Built automated CI/CD pipeline with GitHub Actions triggering E2E tests, Docker builds, and zero-downtime deployments on merge to main."*

---

### 3.5 🟢 Docker Containerization

**Solution:** Multi-stage Dockerfile for the backend.

```dockerfile
# backend/Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3001
CMD ["node", "index.js"]
```

---

## 5. Phase 4 — Monetization & Growth

### 4.1 ⚪ Premium Subscription — "Guftaguu Pro"
- Custom avatars and display name badges
- Priority matchmaking queue (skip ahead)
- Access to exclusive game modes

### 4.2 ⚪ Public Room Mode
- Named chat rooms on specific topics (Gaming, Books, Music)
- Max 2 participants per room (maintain the intimacy)
- Rooms browsable from lobby

### 4.3 ⚪ Bot for Busy Periods
- If no partner is available after 30s, offer to chat with an AI companion
- Uses GPT-4o API to simulate a stranger
- Clear disclosure that they're chatting with an AI

### 4.4 ⚪ Native Mobile App (React Native)
- Cross-platform iOS/Android using shared game logic
- Push notifications for match found (via FCM)
- Native WebRTC implementation

---

## 6. Technical Debt Log

Issues known in the current implementation that need fixing.

| ID | Issue | Severity | File | Notes |
|----|-------|----------|------|-------|
| TD-001 | No input validation on socket payloads | 🔴 High | All handlers | Add Zod schemas |
| TD-002 | `activeUsers` has no max-size bound | 🟡 Med | socket/index.js | Add periodic cleanup sweep |
| TD-003 | `console.log` used throughout backend | 🟡 Med | All backend files | Migrate to Winston/Pino |
| TD-004 | Chess timer runs on client only | 🟡 Med | ChessBoardGame.jsx | Move to server for fairness |
| TD-005 | No unit tests | 🟡 Med | — | Add Jest unit tests for winLogic |
| TD-006 | `gameType` is untyped string | 🟢 Low | ChatInterface.jsx | Convert to TypeScript enum |
| TD-007 | ChatInterface.jsx is still 950+ lines | 🟢 Low | views/ChatInterface.jsx | Split into custom hooks |
| TD-008 | No HTTPS enforcement on local dev | 🟢 Low | backend/index.js | Add redirect middleware |
| TD-009 | Browserslist DB is outdated (7 months) | ⚪ Low | frontend/ | Run `npx update-browserslist-db` |

---

## 7. Backlog (Unplanned)

Ideas that have been considered but not scheduled:

- **Language Filter** — Optional profanity filter toggle for users who want cleaner chats
- **Screenshot Prevention** — CSS `user-select: none` + canvas-based message rendering
- **Accessibility (A11y)** — Keyboard navigation for game boards, ARIA labels
- **Progressive Web App (PWA)** — Add service worker for offline splash and installability
- **Chat Themes** — Allow users to pick light/dark/neon theme variants
- **Shared Music** — Both users listen to the same Spotify track during chat (Spotify API)
- **Leaderboard** — Persistent anonymous chess ELO rating system
- **Match Replay** — Store last game move sequence in sessionStorage for replay after game ends
- **Admin Dashboard** — Internal view of connected users, active rooms, Redis stats (admin-key protected)
