package com.kaptika.api.performance;

import com.kaptika.api.common.InvalidRequestDataException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Set;

/**
 * Janela de dias locais {@code [from, to]} terminando hoje no fuso do servidor
 * (FR-008), e o intervalo equivalente em instantes {@code [start, end)} usado
 * nos filtros — assim as consultas aproveitam os índices por data/hora.
 */
record PerformanceWindow(int days, LocalDate from, LocalDate to, Instant start, Instant end) {

    static final int DEFAULT_DAYS = 30;
    private static final Set<Integer> ALLOWED_DAYS = Set.of(7, 30, 90);

    static PerformanceWindow of(String rawDays, Clock clock, ZoneId zone) {
        int days = parseDays(rawDays);
        LocalDate to = LocalDate.now(clock.withZone(zone));
        LocalDate from = to.minusDays(days - 1L);
        return new PerformanceWindow(days, from, to,
                from.atStartOfDay(zone).toInstant(),
                to.plusDays(1).atStartOfDay(zone).toInstant());
    }

    private static int parseDays(String raw) {
        if (raw == null || raw.isBlank()) {
            return DEFAULT_DAYS;
        }
        try {
            int days = Integer.parseInt(raw.trim());
            if (ALLOWED_DAYS.contains(days)) {
                return days;
            }
        } catch (NumberFormatException ignored) {
            // cai na mensagem de regra violada abaixo
        }
        throw new InvalidRequestDataException("days: valor inválido — use 7, 30 ou 90");
    }
}
