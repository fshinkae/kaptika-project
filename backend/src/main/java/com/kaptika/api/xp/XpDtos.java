package com.kaptika.api.xp;

import java.time.Instant;
import java.util.UUID;

/** Contratos de saída da feature 003. Records → serialização automática. */
public final class XpDtos {

    private XpDtos() {
    }

    /** Resposta de GET /me/xp (FR-006) + XP da semana vigente. */
    public record XpSummaryResponse(long xpTotal, int level, long xpToNextLevel, long xpInPeriod) {
    }

    /** Consulta consolidada para o Placar 006 (FR-007) — consumo interno, sem endpoint. */
    public record ConsolidatedXp(UUID profileId, long xpTotal, long xpInPeriod,
            Instant periodStart) {
    }
}
