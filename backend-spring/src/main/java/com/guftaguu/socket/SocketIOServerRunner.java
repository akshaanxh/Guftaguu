package com.guftaguu.socket;

import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.SocketIOServer;
import com.guftaguu.model.ActiveUser;
import com.guftaguu.service.DiscordService;
import com.guftaguu.service.SessionStateService;
import com.guftaguu.socket.handler.GameHandler;
import com.guftaguu.socket.handler.MatchmakingHandler;
import com.guftaguu.socket.handler.MessagingHandler;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Bootstraps the netty-socketio server and wires all connection lifecycle events.
 * Mirrors Node.js socket/index.js + backend/index.js combined.
 *
 * netty-socketio 2.0.x BroadcastOperations API notes:
 *   sendEvent(name, excludedClient, data...) → sends to room EXCEPT one client
 *   sendEvent(name, data...)                 → sends to ALL in room
 *   getAuthToken()                           → returns Object (must cast)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SocketIOServerRunner implements CommandLineRunner {

    private static final String WAITING_QUEUE = "waiting_queue";

    private final SocketIOServer server;
    private final SessionStateService state;
    private final StringRedisTemplate redis;
    private final DiscordService discordService;
    private final MatchmakingHandler matchmakingHandler;
    private final GameHandler gameHandler;
    private final MessagingHandler messagingHandler;

    private final ScheduledExecutorService reconnectScheduler = Executors.newScheduledThreadPool(4);

    @Override
    public void run(String... args) {
        matchmakingHandler.register(server);
        gameHandler.register(server);
        messagingHandler.register(server);

        // Heartbeat
        server.addEventListener("ping", Object.class, (client, data, ack) ->
            client.sendEvent("pong")
        );

        server.addConnectListener(this::onConnect);
        server.addDisconnectListener(this::onDisconnect);

        server.start();

        // Clear stale queue entries (same as Node.js redis.del on startup)
        redis.delete(WAITING_QUEUE);
        log.info("🧹 Waiting queue cleared.");
        log.info("✅ Socket.IO server started on port {}", server.getConfiguration().getPort());
    }

    // ── onConnect ─────────────────────────────────────────────────────────────

    private void onConnect(SocketIOClient client) {
        String userId       = null;
        String name         = null;
        String clientRoomId = null;

        // netty-socketio 2.0.x: getAuthToken() returns Object — must cast
        try {
            @SuppressWarnings("unchecked")
            Map<String, String> auth = (Map<String, String>) client.getHandshakeData().getAuthToken();
            if (auth != null) {
                userId       = auth.get("userId");
                name         = auth.get("name");
                clientRoomId = auth.get("roomId");
            }
        } catch (Exception ignored) {}

        // Fallback to query params (older clients)
        if (userId == null)       userId       = client.getHandshakeData().getSingleUrlParam("userId");
        if (name == null)         name         = client.getHandshakeData().getSingleUrlParam("name");
        if (clientRoomId == null) clientRoomId = client.getHandshakeData().getSingleUrlParam("roomId");

        String initialName = (name != null && !name.isBlank()) ? name : "Stranger";

        if (userId != null && !userId.isBlank()) {
            log.info("👤 User session identified: {} ({})", userId, initialName);
            state.mapSocket(client.getSessionId(), userId);

            ActiveUser existing = state.getUser(userId);
            if (existing != null) {
                // ── Reconnection path ──────────────────────────────────────
                if (existing.getDisconnectTimer() != null) {
                    existing.getDisconnectTimer().cancel(false);
                    existing.setDisconnectTimer(null);
                    log.info("✨ Reconnection successful for user {}", userId);
                }
                existing.setSocketId(client.getSessionId().toString());
                existing.setStatus("active");
                if (!"Stranger".equals(initialName)) existing.setName(initialName);

            } else {
                // ── New session path ───────────────────────────────────────
                state.putUser(userId, new ActiveUser(
                    client.getSessionId().toString(), initialName, "active", null
                ));
            }

            // Auto-rejoin active room if one exists
            String activeRoomId = state.getRoom(userId);
            if (activeRoomId != null) {
                log.info("🔄 Auto-rejoining user {} to room {}", userId, activeRoomId);
                client.joinRoom(activeRoomId);

                // Notify partner user is back — exclude the reconnecting client itself
                client.getNamespace().getRoomOperations(activeRoomId)
                    .sendEvent("partner_status_change", client, Map.of("status", "active"));

                String partnerUserId = state.getPartnerUserId(activeRoomId, userId);
                String partnerName   = "Stranger";
                if (partnerUserId != null) {
                    ActiveUser partner = state.getUser(partnerUserId);
                    if (partner != null) partnerName = partner.getName();
                }

                client.sendEvent("rejoined_room", Map.of(
                    "roomId",      activeRoomId,
                    "partnerId",   partnerUserId != null ? partnerUserId : "",
                    "partnerName", partnerName
                ));

            } else if (clientRoomId != null && !clientRoomId.isBlank()) {
                // Client claims a room the server no longer knows about
                log.info("💀 Client reported stale roomId {}. Connection dead.", clientRoomId);
                client.sendEvent("connection_dead");
            }

        } else {
            log.info("User connected (anonymous): {}", client.getSessionId());
        }
    }

    // ── onDisconnect ──────────────────────────────────────────────────────────

    private void onDisconnect(SocketIOClient client) {
        String myUserId = state.getUserIdBySocket(client.getSessionId());
        if (myUserId == null) {
            log.info("Anonymous user disconnected: {}", client.getSessionId());
            return;
        }

        log.info("User disconnected: {} (userId: {})", client.getSessionId(), myUserId);
        state.unmapSocket(client.getSessionId());

        ActiveUser user = state.getUser(myUserId);
        if (user == null) return;

        user.setStatus("disconnected");
        String roomId = state.getRoom(myUserId);

        if (roomId != null) {
            log.info("⏳ User {} disconnected from room {}. 60s reconnection window started.", myUserId, roomId);

            // Notify partner of disconnection (exclude the disconnecting client)
            client.getNamespace().getRoomOperations(roomId)
                .sendEvent("partner_status_change", client, Map.of("status", "disconnected"));

            if (user.getDisconnectTimer() != null) user.getDisconnectTimer().cancel(false);

            final String fUserId = myUserId;
            final String fRoomId = roomId;

            var timer = reconnectScheduler.schedule(() -> {
                log.info("💀 Reconnection window expired for {}. Cleaning up room {}.", fUserId, fRoomId);

                // Permanently notify partner
                server.getRoomOperations(fRoomId).sendEvent("partner_disconnected");

                String partnerUserId = state.getPartnerUserId(fRoomId, fUserId);
                state.removeRoom(fUserId);
                if (partnerUserId != null) state.removeRoom(partnerUserId);
                state.removeUser(fUserId);
                state.removeReactionState(fRoomId);

                redis.opsForList().remove(WAITING_QUEUE, 0, fUserId);
                if (partnerUserId != null) redis.opsForList().remove(WAITING_QUEUE, 0, partnerUserId);

            }, 60, TimeUnit.SECONDS);

            user.setDisconnectTimer(timer);

        } else {
            // Not in a room — clean up immediately
            redis.opsForList().remove(WAITING_QUEUE, 0, myUserId);
            state.removeUser(myUserId);
        }
    }

    // ── Site stats broadcast every 5 seconds ─────────────────────────────────

    @Scheduled(fixedRate = 5000)
    public void broadcastStats() {
        try {
            int total = server.getAllClients().size();
            int busy  = state.busyUserCount();
            int idle  = Math.max(0, total - busy);
            server.getBroadcastOperations().sendEvent("site_stats", Map.of("idle", idle, "total", total));
        } catch (Exception e) {
            log.error("Stats broadcast error: {}", e.getMessage());
        }
    }

    // ── Graceful shutdown ─────────────────────────────────────────────────────

    @PreDestroy
    public void stop() {
        log.info("Stopping Socket.IO server...");
        server.stop();
        reconnectScheduler.shutdownNow();
    }
}
