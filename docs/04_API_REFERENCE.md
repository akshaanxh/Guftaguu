# 04 — API Reference
## HTTP REST API & WebSocket Event Reference

> **Version:** 1.0.0 | **Base URL (Production):** `https://guftaguu-backend.onrender.com` | **Base URL (Local):** `http://localhost:3001`

---

## Table of Contents

1. [HTTP REST API](#1-http-rest-api)
2. [WebSocket Connection](#2-websocket-connection)
3. [WebSocket Events — Client to Server](#3-websocket-events--client-to-server)
4. [WebSocket Events — Server to Client](#4-websocket-events--server-to-client)
5. [Error Handling](#5-error-handling)
6. [Data Schemas](#6-data-schemas)

---

## 1. HTTP REST API

### `GET /`

Health check endpoint.

**Request:**
```http
GET /
```

**Response:**
```
200 OK
Content-Type: text/html

Guftaguu Server is Alive!
```

---

### `POST /api/report`

Submit a bug report or feedback. Forwarded to the Discord webhook as an embed message.

**Request:**
```http
POST /api/report
Content-Type: application/json

{
  "title": "string",        // Required. Short title of the report.
  "description": "string",  // Required. Full description of the issue.
  "type": "string"          // Required. Report category. e.g. "Bug Report", "Feature Request"
}
```

**Responses:**

`200 OK` — Report delivered to Discord.
```json
{
  "success": true
}
```

`400 Bad Request` — Missing required fields.
```json
{
  "error": "Missing fields"
}
```

`500 Internal Server Error` — Discord webhook delivery failed.
```json
{
  "error": "Failed to send report"
}
```

**Example (cURL):**
```bash
curl -X POST https://guftaguu-backend.onrender.com/api/report \
  -H "Content-Type: application/json" \
  -d '{"title": "Chat bug", "description": "Messages not showing", "type": "Bug Report"}'
```

---

## 2. WebSocket Connection

### Connection URL

```
Production: wss://guftaguu-backend.onrender.com
Local:      ws://localhost:3001
```

### Client Initialization

```js
import io from 'socket.io-client';

const socket = io(SERVER_URL, {
    auth: {
        userId: string,    // Persistent user ID from localStorage. Required for reconnection.
        name: string,      // Display name chosen by the user.
        roomId: string | null  // Active room ID if client believes it's in a room.
    },
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ['websocket']
});
```

### Auth Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | `string` | Yes | Unique persistent user identifier. Generated and stored in `localStorage`. Format: `user_{random}_{timestamp}` |
| `name` | `string` | Yes | Display name selected on NameScreen |
| `roomId` | `string \| null` | No | If provided, server checks if this room is still active and attempts auto-rejoin |

### Connection Lifecycle Events

```js
socket.on('connect', () => { /* Socket connected */ });
socket.on('disconnect', (reason) => { /* Socket disconnected */ });
socket.on('connect_error', (error) => { /* Connection failed */ });
socket.on('reconnect', (attemptNumber) => { /* Reconnected */ });
socket.on('reconnect_attempt', () => { /* Attempt in progress */ });
socket.on('reconnect_failed', () => { /* All attempts exhausted */ });
```

---

## 3. WebSocket Events — Client to Server

### Matchmaking

---

#### `find_match`
Enter the matchmaking queue. Server will attempt to pair with an available partner.

**Payload:** None

**Triggers server response:** `match_found` (to both clients) when a partner is found.

```js
socket.emit('find_match');
```

---

#### `block_user`
Block a specific user for 10 minutes. Ends the current chat session.

**Payload:**
```ts
{
  roomId: string,    // Current room ID
  partnerId: string  // User ID of the person to block
}
```

**Side effects:**
- Partner receives `partner_disconnected`
- Both users' `userRooms` entries are deleted
- Block key stored in Redis with 600s TTL

```js
socket.emit('block_user', { roomId, partnerId });
```

---

### Messaging

---

#### `send_name`
Share your display name with your matched partner.

**Payload:**
```ts
{
  roomId: string,  // Current room ID
  name: string     // Display name (will be sanitized server-side)
}
```

```js
socket.emit('send_name', { roomId, name: 'Alex' });
```

---

#### `send_message`
Send a chat message to your partner.

**Payload:**
```ts
{
  roomId: string,
  message: {
    text: string,        // Message content
    replyTo: Message | null  // Optional: the message being replied to
  }
}
```

**Note:** Server validates room membership before relaying. If socket is not in the room, emits `connection_dead` back.

```js
socket.emit('send_message', {
    roomId,
    message: { text: 'Hello!', replyTo: null }
});
```

---

#### `typing`
Notify partner of typing status.

**Payload:**
```ts
{
  roomId: string,
  isTyping: boolean
}
```

```js
socket.emit('typing', { roomId, isTyping: true });
// Debounce: emit false after 1000ms of no keystrokes
```

---

#### `user_status_change`
Notify server of tab visibility changes.

**Payload:**
```ts
{
  status: 'active' | 'inactive'
}
```

```js
document.addEventListener('visibilitychange', () => {
    socket.emit('user_status_change', {
        status: document.visibilityState === 'visible' ? 'active' : 'inactive'
    });
});
```

---

#### `leave_room`
Voluntarily end the current chat and leave the room.

**Payload:**
```ts
{
  roomId: string
}
```

```js
socket.emit('leave_room', { roomId });
```

---

#### `ping`
Custom heartbeat ping. Server responds with `pong`.

**Payload:** None

```js
socket.emit('ping');
socket.once('pong', () => { /* Connection alive */ });
```

---

### Games

---

#### `request_game`
Invite partner to play a game.

**Payload:**
```ts
{
  roomId: string,
  gameType: GameType  // See GameType enum below
}
```

**GameType values:**
```
'tictactoe' | 'connect4' | 'dotsboxes' | 'reaction' | 'chess-3' | 'chess-10' | 'chess-unlimited'
```

```js
socket.emit('request_game', { roomId, gameType: 'chess-3' });
```

---

#### `accept_game`
Accept a received game invitation.

**Payload:**
```ts
{
  roomId: string,
  gameType: GameType
}
```

```js
socket.emit('accept_game', { roomId, gameType: 'chess-3' });
```

---

#### `decline_game`
Decline a received game invitation.

**Payload:**
```ts
{
  roomId: string
}
```

```js
socket.emit('decline_game', { roomId });
```

---

#### `make_move`
Submit a game move. Behavior varies by `gameType`.

**Payload (standard games — Tic-Tac-Toe, Connect 4):**
```ts
{
  roomId: string,
  index: number,       // Board cell index (0-based)
  symbol: 'X' | 'O'   // Player's symbol
}
```

**Payload (Dots & Boxes):**
```ts
{
  roomId: string,
  index: 0,
  symbol: 'X' | 'O',
  gameType: 'dotsboxes',
  extraData: {
    game: 'dotsboxes',
    type: 'h' | 'v',   // Horizontal or vertical line
    index: number        // Line index in hLines[] or vLines[]
  }
}
```

**Payload (Chess):**
```ts
{
  roomId: string,
  index: 0,
  symbol: 'X' | 'O',
  gameType: 'chess-3' | 'chess-10' | 'chess-unlimited',
  extraData: {
    game: 'chess',
    gameState: ChessGameState  // Full board state after move
  }
}
```

**Payload (Reaction):**
```ts
{
  roomId: string,
  symbol: 'click',
  gameType: 'reaction'
}
```

---

#### `offer_draw`
Offer a chess draw to the partner.

**Payload:**
```ts
{ roomId: string }
```

---

#### `accept_draw`
Accept a chess draw offer.

**Payload:**
```ts
{ roomId: string }
```

---

#### `decline_draw`
Decline a chess draw offer.

**Payload:**
```ts
{ roomId: string }
```

---

## 4. WebSocket Events — Server to Client

### Matchmaking & Session

---

#### `match_found`
Both users have been paired into a room.

**Payload:**
```ts
{
  roomId: string,      // Format: "{partnerUserId}-{myUserId}"
  partnerId: string    // Partner's userId
}
```

**Action:** Initialize chat UI, emit `send_name`, reset game state.

---

#### `rejoined_room`
Reconnection was successful — user has been restored to their active room.

**Payload:**
```ts
{
  roomId: string,
  partnerId: string,
  partnerName: string
}
```

**Action:** Restore sessionStorage chat history, set UI to chatting state.

---

#### `connection_dead`
Client's claimed roomId is no longer active on the server.

**Payload:** None

**Action:** Reset to idle state, clear sessionStorage for that room.

---

#### `site_stats`
Live platform statistics broadcast every 5 seconds to all connected clients.

**Payload:**
```ts
{
  idle: number,   // Users waiting for a match
  total: number   // Total connected users
}
```

---

### Messaging & Presence

---

#### `receive_name`
Your partner's (sanitized) display name.

**Payload:** `string` — the display name

---

#### `receive_message`
A new chat message from your partner.

**Payload:**
```ts
{
  text: string,
  replyTo: Message | null
}
```

---

#### `display_typing`
Partner's typing status changed.

**Payload:** `boolean` — `true` if typing, `false` if stopped

---

#### `partner_disconnected`
Partner has permanently left (intentionally or after 60s timeout).

**Payload:** None

**Action:** Show "Partner disconnected" banner, offer "Find New Match".

---

#### `partner_status_change`
Partner's presence status changed.

**Payload:**
```ts
{
  status: 'active' | 'inactive' | 'disconnected'
}
```

| Status | Meaning |
|--------|---------|
| `active` | Partner is in the tab and online |
| `inactive` | Partner switched to another tab |
| `disconnected` | Partner lost connection (60s window open) |

---

### Games

---

#### `game_requested`
Partner has sent a game invitation.

**Payload:** `GameType` string (e.g., `'chess-3'`)

---

#### `game_start`
Both players accepted — game begins.

**Payload:**
```ts
{
  gameType: GameType,
  starterId: string  // socket.id of the player who ACCEPTED (they get 'O', the requester gets 'X')
}
```

**Symbol Assignment:**
```
starterId === socket.id  →  mySymbol = 'O', isMyTurn = false
starterId !== socket.id  →  mySymbol = 'X', isMyTurn = true
```

---

#### `game_declined`
Partner declined your game invitation.

**Payload:** None

---

#### `receive_move`
Your opponent has made a move.

**Payload:**
```ts
{
  index: number,
  symbol: string,
  extraData?: object  // Populated for chess and dotsboxes
}
```

---

#### `reaction_green_light`
The reaction game is active — click as fast as possible!

**Payload:** `number` — server timestamp of when green light fired

---

#### `reaction_result`
Reaction game has a winner.

**Payload:**
```ts
{
  winnerId: string,  // socket.id of the faster player
  time: number       // Reaction time in milliseconds
}
```

---

#### `draw_offered`
Partner has offered a chess draw.

**Payload:** None

---

#### `draw_accepted`
Draw has been accepted by both players. Game ends in a draw.

**Payload:** None

---

#### `draw_declined`
Partner declined your draw offer. Game continues.

**Payload:** None

---

#### `pong`
Server response to client `ping`. Confirms connection is alive.

**Payload:** None

---

## 5. Error Handling

### Connection Failures
```js
socket.on('connect_error', (error) => {
    // error.message: "websocket error", "timeout", "xhr poll error"
    setIsConnected(false);
});

socket.on('reconnect_failed', () => {
    // All 15 reconnection attempts exhausted
    if (status === 'chatting') {
        alert("Failed to reconnect. Please refresh the page.");
    }
});
```

### Server-Initiated Errors
| Event | Meaning | Client Action |
|-------|---------|---------------|
| `connection_dead` | Room no longer exists | Emit `resetAll()`, go to idle |
| `receive_message` (not in room) | Socket left room | Emit `connection_dead` to self |

### HTTP API Error Codes
| Code | Meaning |
|------|---------|
| `400` | Missing required fields in request body |
| `500` | Discord webhook failed (network issue) |

---

## 6. Data Schemas

### Message
```ts
interface Message {
  text: string;
  sender: 'me' | 'stranger';
  replyTo: Message | null;
}
```

### ChessGameState
```ts
interface ChessGameState {
  fen: string;             // Full board state in FEN notation
  whiteTime: number | null; // Seconds remaining (null = unlimited)
  blackTime: number | null;
  timeControl: '3' | '10' | 'unlimited';
}
```

### DotsBoxesBoard
```ts
interface DotsBoxesBoard {
  hLines: boolean[];  // [30] — horizontal lines on 6×5 grid
  vLines: boolean[];  // [30] — vertical lines on 5×6 grid
  boxes: ('X' | 'O' | null)[];  // [25] — 5×5 box ownership
}
```

### ActiveUser (Server Internal)
```ts
interface ActiveUser {
  socketId: string;
  name: string;
  status: 'active' | 'inactive' | 'disconnected';
  disconnectTimer: NodeJS.Timeout | null;
}
```
