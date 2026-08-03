package com.guftaguu.socket.handler;

import com.corundumstudio.socketio.SocketIOServer;
import com.guftaguu.model.ActiveUser;
import com.guftaguu.service.SessionStateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Handles all chat and presence events.
 * Direct port of backend/socket/handlers/messaging.js
 *
 * NOTE: netty-socketio 2.0.x BroadcastOperations API:
 *   sendEvent(name, excludedClient, data...) — sends to room EXCEPT excludedClient
 *   sendEvent(name, data...)                 — sends to ALL in room
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MessagingHandler {

    private static final String ADMIN_KEY = "veer117542";

    private final SessionStateService state;

    public void register(SocketIOServer server) {

        // ── send_name ────────────────────────────────────────────────────────
        server.addEventListener("send_name", Map.class, (client, data, ack) -> {
            String roomId = (String) data.get("roomId");
            String name   = (String) data.get("name");
            String finalName = sanitizeName(name);
            // Send to partner only (exclude sender)
            client.getNamespace().getRoomOperations(roomId)
                .sendEvent("receive_name", client, finalName);
        });

        // ── send_message ─────────────────────────────────────────────────────
        server.addEventListener("send_message", Map.class, (client, data, ack) -> {
            String roomId = (String) data.get("roomId");

            if (!client.getAllRooms().contains(roomId)) {
                client.sendEvent("connection_dead");
                return;
            }

            Object message = data.get("message");
            // Relay message to partner only
            client.getNamespace().getRoomOperations(roomId)
                .sendEvent("receive_message", client, message);
        });

        // ── typing ───────────────────────────────────────────────────────────
        server.addEventListener("typing", Map.class, (client, data, ack) -> {
            String roomId    = (String) data.get("roomId");
            Boolean isTyping = (Boolean) data.get("isTyping");
            client.getNamespace().getRoomOperations(roomId)
                .sendEvent("display_typing", client, isTyping);
        });

        // ── user_status_change ───────────────────────────────────────────────
        server.addEventListener("user_status_change", Map.class, (client, data, ack) -> {
            String myUserId = state.getUserIdBySocket(client.getSessionId());
            if (myUserId == null) return;

            String newStatus = (String) data.get("status");
            ActiveUser user = state.getUser(myUserId);
            if (user != null) {
                user.setStatus(newStatus);
                String roomId = state.getRoom(myUserId);
                if (roomId != null) {
                    client.getNamespace().getRoomOperations(roomId)
                        .sendEvent("partner_status_change", client, Map.of("status", newStatus));
                }
            }
        });

        // ── leave_room ───────────────────────────────────────────────────────
        server.addEventListener("leave_room", Map.class, (client, data, ack) -> {
            String roomId   = (String) data.get("roomId");
            String myUserId = state.getUserIdBySocket(client.getSessionId());

            // Tell partner the chat is permanently over
            client.getNamespace().getRoomOperations(roomId)
                .sendEvent("partner_disconnected", client);

            client.leaveRoom(roomId);

            if (myUserId != null) {
                state.removeRoom(myUserId);
                state.removeReactionState(roomId);

                String partnerUserId = state.getPartnerUserId(roomId, myUserId);
                if (partnerUserId != null) {
                    state.removeRoom(partnerUserId);
                    ActiveUser partner = state.getUser(partnerUserId);
                    if (partner != null && partner.getDisconnectTimer() != null) {
                        partner.getDisconnectTimer().cancel(false);
                        state.removeUser(partnerUserId);
                    }
                }
            }
        });
    }

    // ── Name sanitization ────────────────────────────────────────────────────
    private String sanitizeName(String name) {
        if (name == null) return "Stranger";
        if (name.equals(ADMIN_KEY)) return "👑 Admin";
        String lower = name.toLowerCase();
        if (lower.contains("admin") || lower.contains("system") || lower.contains("mod")) {
            return "⚠️ Imposter";
        }
        return name;
    }
}
