package com.kaptika.api.xp;

import com.kaptika.api.xp.XpDtos.ConsolidatedXp;
import com.kaptika.api.xp.XpDtos.XpSummaryResponse;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Caminho de leitura do XP: resumo do estudante autenticado (FR-006) e a
 * consulta consolidada que alimenta o Placar 006 (FR-007). Total em O(1)
 * via xp_balances; período semanal somado sobre a trilha com índice
 * (profile_id, granted_at) — atende o p95 de 300 ms (SC-005).
 */
@Service
public class XpQueryService {

    /** Semana vigente: segunda-feira 00:00 neste fuso (alinhado à feature 004). */
    static final ZoneId PERIOD_ZONE = ZoneId.of("America/Sao_Paulo");

    private final XpBalanceRepository balances;
    private final XpGrantRepository grants;

    public XpQueryService(XpBalanceRepository balances, XpGrantRepository grants) {
        this.balances = balances;
        this.grants = grants;
    }

    /** Resumo para GET /me/xp: total, nível, XP p/ próximo nível e XP da semana. */
    @Transactional(readOnly = true)
    public XpSummaryResponse summaryFor(UUID profileId) {
        long total = totalFor(profileId);
        return new XpSummaryResponse(total, LevelCurve.levelFor(total),
                LevelCurve.xpToNextLevel(total), xpInCurrentPeriod(profileId));
    }

    /**
     * Consulta consolidada por estudante para o Placar 006 (FR-007):
     * XP total e XP do período semanal vigente. Consumo interno — o
     * endpoint de ranking é responsabilidade da 006.
     */
    @Transactional(readOnly = true)
    public ConsolidatedXp consolidatedFor(UUID profileId) {
        return new ConsolidatedXp(profileId, totalFor(profileId),
                xpInCurrentPeriod(profileId), currentPeriodStart());
    }

    /** Início da semana vigente: segunda 00:00 America/Sao_Paulo, como Instant. */
    public static Instant currentPeriodStart() {
        return LocalDate.now(PERIOD_ZONE)
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                .atStartOfDay(PERIOD_ZONE)
                .toInstant();
    }

    private long totalFor(UUID profileId) {
        return balances.findById(profileId).map(XpBalance::getXpTotal).orElse(0L);
    }

    private long xpInCurrentPeriod(UUID profileId) {
        return grants.sumAmountSince(profileId, currentPeriodStart());
    }
}
