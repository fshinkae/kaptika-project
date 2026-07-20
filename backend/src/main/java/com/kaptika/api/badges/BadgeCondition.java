package com.kaptika.api.badges;

/**
 * Tipos de condição do catálogo (FR-006/FR-008). O avaliador é genérico:
 * cada tipo sabe extrair dos contadores próprios da feature o valor atual a
 * comparar com a meta da medalha — adicionar medalha de um tipo existente é
 * só inserir uma linha no catálogo.
 */
public enum BadgeCondition {

    SESSIONS_COMPLETED,
    STREAK_DAYS,
    CORRECT_ANSWERS,
    AREAS_EXPLORED,
    XP_TOTAL;

    /** Valor acumulado atual do estudante para este tipo de condição. */
    public long currentValue(BadgeCounters counters) {
        if (counters == null) {
            return 0;
        }
        return switch (this) {
            case SESSIONS_COMPLETED -> counters.getSessionsCompleted();
            case STREAK_DAYS -> counters.getStreakBest();
            case CORRECT_ANSWERS -> counters.getCorrectTotal();
            case AREAS_EXPLORED -> Integer.bitCount(counters.getAreasMask());
            case XP_TOTAL -> counters.getXpTotal();
        };
    }
}
