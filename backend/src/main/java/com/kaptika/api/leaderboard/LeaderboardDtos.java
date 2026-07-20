package com.kaptika.api.leaderboard;

import com.kaptika.api.common.InvalidRequestDataException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Contratos do placar (FR-001..005). */
public final class LeaderboardDtos {

    private LeaderboardDtos() {
    }

    public enum Scope {
        GLOBAL, WEEKLY;

        public static Scope parse(String raw) {
            if ("global".equalsIgnoreCase(raw)) {
                return GLOBAL;
            }
            if ("weekly".equalsIgnoreCase(raw)) {
                return WEEKLY;
            }
            throw new InvalidRequestDataException("scope: use global ou weekly");
        }
    }

    /** Item do ranking; profileId desambigua nomes repetidos (FR-002). */
    public record Entry(long rank, UUID profileId, String displayName, long xp) {
    }

    /** Posição do próprio estudante, sempre presente e calculada na hora (FR-003). */
    public record MyPosition(long rank, long xp) {
    }

    /** Página do ranking + metadados (FR-004/005/007). */
    public record Page(String scope, Instant periodStart, int page, int size,
            long totalStudents, List<Entry> entries) {
    }

    public record LeaderboardResponse(String scope, Instant periodStart, int page, int size,
            long totalStudents, List<Entry> entries, MyPosition me) {
    }
}
