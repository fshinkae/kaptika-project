package com.kaptika.api.performance;

import java.time.LocalDate;
import java.util.List;

/** Contrato do GET /me/performance (FR-002, FR-004, FR-007). */
public final class PerformanceDtos {

    private PerformanceDtos() {
    }

    public enum Reason { NOT_PRACTICED, LOWEST_ACCURACY, INSUFFICIENT_DATA }

    public record PerformanceResponse(
            int windowDays,
            LocalDate from,
            LocalDate to,
            Totals totals,
            List<AreaPerformance> areas,
            Recommendation recommendation,
            List<DailyPoint> daily) {
    }

    /** {@code accuracy} é nulo sem respostas — "não praticado" não é "0% de acerto". */
    public record Totals(int answered, int correct, int wrong, Double accuracy) {
    }

    public record AreaPerformance(String area, int answered, int correct, int wrong, Double accuracy) {
    }

    /** {@code area} (slug) é nula quando o motivo é INSUFFICIENT_DATA. */
    public record Recommendation(String area, Reason reason) {
    }

    public record DailyPoint(LocalDate date, long xp, int answered, int correct, boolean activeDay) {
    }

    static Double accuracy(int answered, int correct) {
        return answered == 0 ? null : (double) correct / answered;
    }
}
