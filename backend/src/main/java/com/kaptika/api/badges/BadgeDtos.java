package com.kaptika.api.badges;

import java.time.Instant;
import java.util.List;

/** Contratos de resposta de GET /me/badges (FR-004/FR-005). Records → JSON. */
public final class BadgeDtos {

    private BadgeDtos() {
    }

    /** Progresso rumo à meta; para conquistadas, current == target. */
    public record Progress(long current, long target) {
    }

    /**
     * Uma medalha da coleção: conquistada (achieved + awardedAt) ou bloqueada
     * (objetivo em description + progresso atual X/Y).
     */
    public record BadgeView(
            String slug,
            String name,
            String description,
            boolean achieved,
            Instant awardedAt,
            Progress progress) {
    }

    /** Coleção completa, ordenada pelo sort_order do catálogo. */
    public record BadgeCollectionResponse(
            List<BadgeView> badges,
            int achievedCount,
            int totalCount) {
    }
}
