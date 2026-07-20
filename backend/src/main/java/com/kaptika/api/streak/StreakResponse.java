package com.kaptika.api.streak;

import java.time.Instant;

/**
 * Contrato do GET /me/streak (FR-005/007/011). brokenAt só acompanha
 * brokenSinceLastAccess = true — a quebra é reportada uma única vez.
 */
public record StreakResponse(
        int current,
        int record,
        int freezes,
        boolean metToday,
        boolean brokenSinceLastAccess,
        Instant brokenAt) {
}
