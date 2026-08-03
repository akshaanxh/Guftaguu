package com.guftaguu.socket.handler;

import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.SocketIOServer;
import com.guftaguu.model.ReactionState;
import com.guftaguu.service.SessionStateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Handles all multiplayer game events.
 * Direct port of backend/socket/handlers/game.js
 *
 * NOTE: netty-socketio 2.0.x BroadcastOperations API:
 *   sendEvent(name, excludedClient, data...) — sends to room EXCEPT excludedClient
 *   sendEvent(name, data...)                 — sends to ALL in room
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GameHandler {

    private final SessionStateService state;
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);

    public void register(SocketIOServer server) {

        // ── request_game ────────────────────────────────────────────────────
        server.addEventListener("request_game", Map.class, (client, data, ack) -> {
            String roomId   = (String) data.get("roomId");
            String gameType = (String) data.get("gameType");
            // Send to everyone in room EXCEPT sender
            client.getNamespace().getRoomOperations(roomId)
                .sendEvent("game_requested", client, gameType);
        });

        // ── accept_game ─────────────────────────────────────────────────────
        server.addEventListener("accept_game", Map.class, (client, data, ack) -> {
            String roomId   = (String) data.get("roomId");
            String gameType = (String) data.get("gameType");

            Map<String, String> payload = Map.of(
                "gameType", gameType,
                "starterId", client.getSessionId().toString()
            );
            // Send game_start to EVERYONE in room (including sender)
            server.getRoomOperations(roomId).sendEvent("game_start", payload);

            if ("reaction".equals(gameType)) {
                ReactionState rs = new ReactionState(false, 0L, false);
                state.setReactionState(roomId, rs);

                scheduler.schedule(() -> {
                    if (server.getRoomOperations(roomId).getClients().isEmpty()) return;
                    rs.setActive(true);
                    rs.setStartTime(System.currentTimeMillis());
                    server.getRoomOperations(roomId).sendEvent("reaction_green_light", rs.getStartTime());
                    log.info("⚡ Reaction green light fired for room {}", roomId);
                }, 5, TimeUnit.SECONDS);
            }
        });

        // ── decline_game ─────────────────────────────────────────────────────
        server.addEventListener("decline_game", Map.class, (client, data, ack) -> {
            String roomId = (String) data.get("roomId");
            client.getNamespace().getRoomOperations(roomId)
                .sendEvent("game_declined", client);
        });

        // ── make_move ────────────────────────────────────────────────────────
        server.addEventListener("make_move", Map.class, (client, data, ack) -> {
            String roomId   = (String) data.get("roomId");
            String gameType = (String) data.get("gameType");

            if ("reaction".equals(gameType)) {
                ReactionState rs = state.getReactionState(roomId);
                if (rs == null || rs.isWinnerDeclared()) return;

                if (rs.isActive()) {
                    rs.setWinnerDeclared(true);
                    long reactionTime = System.currentTimeMillis() - rs.getStartTime();
                    Map<String, Object> result = Map.of(
                        "winnerId", client.getSessionId().toString(),
                        "time", reactionTime
                    );
                    server.getRoomOperations(roomId).sendEvent("reaction_result", result);
                    state.removeReactionState(roomId);
                    log.info("🏆 Reaction winner in room {}: {}ms", roomId, reactionTime);
                }
                return;
            }

            // All other games — relay move to partner only (exclude sender)
            Object index     = data.get("index");
            Object symbol    = data.get("symbol");
            Object extraData = data.get("extraData");

            Map<String, Object> movePayload = Map.of(
                "index",     index     != null ? index     : 0,
                "symbol",    symbol    != null ? symbol    : "",
                "extraData", extraData != null ? extraData : Map.of()
            );

            client.getNamespace().getRoomOperations(roomId)
                .sendEvent("receive_move", client, movePayload);
        });

        // ── offer_draw ───────────────────────────────────────────────────────
        server.addEventListener("offer_draw", Map.class, (client, data, ack) -> {
            String roomId = (String) data.get("roomId");
            client.getNamespace().getRoomOperations(roomId)
                .sendEvent("draw_offered", client);
        });

        // ── decline_draw ─────────────────────────────────────────────────────
        server.addEventListener("decline_draw", Map.class, (client, data, ack) -> {
            String roomId = (String) data.get("roomId");
            client.getNamespace().getRoomOperations(roomId)
                .sendEvent("draw_declined", client);
        });

        // ── accept_draw ──────────────────────────────────────────────────────
        server.addEventListener("accept_draw", Map.class, (client, data, ack) -> {
            String roomId = (String) data.get("roomId");
            server.getRoomOperations(roomId).sendEvent("draw_accepted");
        });
    }
}
