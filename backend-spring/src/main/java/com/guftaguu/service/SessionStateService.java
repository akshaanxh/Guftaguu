package com.guftaguu.service;

import com.guftaguu.model.ActiveUser;
import com.guftaguu.model.ReactionState;
import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Thread-safe singleton service holding all in-memory session state.
 *
 * Mirrors the four JS objects from socket/index.js:
 *   activeUsers{}    → userId → ActiveUser
 *   socketUserMap{}  → socket.id (UUID) → userId
 *   userRooms{}      → userId → roomId
 *   reactionState{}  → roomId → ReactionState
 *
 * ConcurrentHashMap is used for all maps because multiple socket event
 * threads can read/write simultaneously in netty-socketio.
 */
@Service
public class SessionStateService {

    // userId → session data
    private final ConcurrentHashMap<String, ActiveUser> activeUsers = new ConcurrentHashMap<>();

    // socket UUID → userId
    private final ConcurrentHashMap<UUID, String> socketUserMap = new ConcurrentHashMap<>();

    // userId → roomId
    private final ConcurrentHashMap<String, String> userRooms = new ConcurrentHashMap<>();

    // roomId → reaction game state
    private final ConcurrentHashMap<String, ReactionState> reactionStates = new ConcurrentHashMap<>();

    // ─── activeUsers ──────────────────────────────────────────────────────────

    public void putUser(String userId, ActiveUser user) {
        activeUsers.put(userId, user);
    }

    public ActiveUser getUser(String userId) {
        return activeUsers.get(userId);
    }

    public void removeUser(String userId) {
        activeUsers.remove(userId);
    }

    public boolean hasUser(String userId) {
        return activeUsers.containsKey(userId);
    }

    // ─── socketUserMap ────────────────────────────────────────────────────────

    public void mapSocket(UUID socketId, String userId) {
        socketUserMap.put(socketId, userId);
    }

    public String getUserIdBySocket(UUID socketId) {
        return socketUserMap.get(socketId);
    }

    public void unmapSocket(UUID socketId) {
        socketUserMap.remove(socketId);
    }

    // ─── userRooms ────────────────────────────────────────────────────────────

    public void setRoom(String userId, String roomId) {
        userRooms.put(userId, roomId);
    }

    public String getRoom(String userId) {
        return userRooms.get(userId);
    }

    public void removeRoom(String userId) {
        userRooms.remove(userId);
    }

    public boolean isInRoom(String userId) {
        return userRooms.containsKey(userId);
    }

    /** Returns total number of users currently in a room. */
    public int busyUserCount() {
        return userRooms.size();
    }

    // ─── reactionState ────────────────────────────────────────────────────────

    public void setReactionState(String roomId, ReactionState state) {
        reactionStates.put(roomId, state);
    }

    public ReactionState getReactionState(String roomId) {
        return reactionStates.get(roomId);
    }

    public void removeReactionState(String roomId) {
        reactionStates.remove(roomId);
    }

    // ─── Utility ──────────────────────────────────────────────────────────────

    /**
     * Given a roomId of format "uidA-uidB", returns the partner of the given userId.
     * Returns null if the partner cannot be determined.
     */
    public String getPartnerUserId(String roomId, String myUserId) {
        if (roomId == null) return null;
        String[] parts = roomId.split("-", 2);
        for (String part : parts) {
            if (!part.equals(myUserId)) return part;
        }
        return null;
    }
}
