package com.guftaguu.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Holds the server-side state for an active Reaction Time game.
 * Stored per-room to ensure server-authoritative timing (no client cheating).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReactionState {

    /** Whether the green light has fired — clicks before this are invalid. */
    private boolean active;

    /** System.currentTimeMillis() when the green light fired. */
    private long startTime;

    /** Prevents double-winner on rapid simultaneous clicks. */
    private boolean winnerDeclared;
}
