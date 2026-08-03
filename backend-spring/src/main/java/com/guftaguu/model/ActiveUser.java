package com.guftaguu.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.concurrent.ScheduledFuture;

/**
 * Represents an active user session in memory.
 * Maps to what Node.js stored in the activeUsers{} map.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ActiveUser {

    /** The UUID of the current Socket.IO session (changes on reconnect). */
    private String socketId;

    /** The display name chosen by the user. */
    private String name;

    /**
     * Presence status.
     * Possible values: "active", "inactive", "disconnected"
     */
    private String status;

    /**
     * Handle to the 60-second reconnection timer.
     * Non-null only when user has disconnected but window is still open.
     * Must be cancelled if the user reconnects within 60s.
     */
    private ScheduledFuture<?> disconnectTimer;
}
