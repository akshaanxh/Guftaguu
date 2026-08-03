package com.guftaguu.socket.handler;

import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.SocketIOServer;
import com.guftaguu.model.ActiveUser;
import com.guftaguu.service.SessionStateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Handles matchmaking queue and user blocking.
 * Direct port of backend/socket/handlers/matchmaking.js
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MatchmakingHandler {

    private static final String WAITING_QUEUE = "waiting_queue";
    private static final int MAX_ATTEMPTS = 10;

    private final StringRedisTemplate redis;
    private final SessionStateService state;

    public void register(SocketIOServer server) {

        // ── find_match ──────────────────────────────────────────────────────
        server.addEventListener("find_match", Object.class, (client, data, ack) -> {
            String myUserId = state.getUserIdBySocket(client.getSessionId());
            if (myUserId == null) return;

            try {
                // Remove self from queue first (idempotent)
                redis.opsForList().remove(WAITING_QUEUE, 0, myUserId);

                String partnerUserId = redis.opsForList().rightPop(WAITING_QUEUE);
                int attempts = 0;

                while (partnerUserId != null) {
                    if (partnerUserId.equals(myUserId)) {
                        partnerUserId = redis.opsForList().rightPop(WAITING_QUEUE);
                        continue;
                    }

                    ActiveUser partnerInfo = state.getUser(partnerUserId);
                    SocketIOClient partnerSocket = (partnerInfo != null)
                        ? server.getClient(UUID.fromString(partnerInfo.getSocketId()))
                        : null;
                    boolean isPartnerBusy = state.isInRoom(partnerUserId);

                    if (partnerSocket != null && !isPartnerBusy
                            && "active".equals(partnerInfo.getStatus())) {

                        // Check blocks in both directions
                        String iBlockedThem = redis.opsForValue().get("block:" + myUserId + ":" + partnerUserId);
                        String theyBlockedMe = redis.opsForValue().get("block:" + partnerUserId + ":" + myUserId);

                        if (iBlockedThem == null && theyBlockedMe == null) {
                            // ✅ Valid match found
                            String roomId = partnerUserId + "-" + myUserId;
                            log.info("✅ MATCH FOUND! Pairing {} with {}", myUserId, partnerUserId);

                            // Join both clients to the room
                            partnerSocket.joinRoom(roomId);
                            client.joinRoom(roomId);

                            state.setRoom(partnerUserId, roomId);
                            state.setRoom(myUserId, roomId);

                            // 100ms delay (race condition fix, same as Node.js)
                            Thread.sleep(100);

                            // Emit match_found to both
                            Map<String, String> payload = Map.of("roomId", roomId, "partnerId", partnerUserId);
                            server.getRoomOperations(roomId).sendEvent("match_found", payload);
                            return;
                        }
                    }

                    // Push valid-but-blocked partner back; skip invalid ones
                    if (partnerSocket != null && partnerInfo != null && "active".equals(partnerInfo.getStatus())) {
                        redis.opsForList().leftPush(WAITING_QUEUE, partnerUserId);
                    }

                    attempts++;
                    if (attempts >= MAX_ATTEMPTS) break;
                    partnerUserId = redis.opsForList().rightPop(WAITING_QUEUE);
                }

                // No partner found — push self to queue and wait
                redis.opsForList().leftPush(WAITING_QUEUE, myUserId);

            } catch (Exception e) {
                log.error("Error in find_match for {}: {}", myUserId, e.getMessage());
            }
        });

        // ── block_user ──────────────────────────────────────────────────────
        server.addEventListener("block_user", Map.class, (client, data, ack) -> {
            String myUserId = state.getUserIdBySocket(client.getSessionId());
            if (myUserId == null) return;

            String roomId = (String) data.get("roomId");
            String partnerId = (String) data.get("partnerId");

            // Store block for 10 minutes (600 seconds)
            redis.opsForValue().set("block:" + myUserId + ":" + partnerId, "1", 600, TimeUnit.SECONDS);

            // Notify partner they've been disconnected
            client.getNamespace().getRoomOperations(roomId).sendEvent("partner_disconnected");

            client.leaveRoom(roomId);
            state.removeRoom(myUserId);
            state.removeRoom(partnerId);
            state.removeReactionState(roomId);

            ActiveUser partner = state.getUser(partnerId);
            if (partner != null && partner.getDisconnectTimer() != null) {
                partner.getDisconnectTimer().cancel(false);
                state.removeUser(partnerId);
            }

            log.info("🚫 {} blocked {}", myUserId, partnerId);
        });
    }
}
