package com.kaptika.api.performance;

import com.kaptika.api.performance.PerformanceDtos.Reason;
import com.kaptika.api.performance.PerformanceDtos.Recommendation;
import com.kaptika.api.performance.PerformanceQueries.Counts;
import com.kaptika.api.session.Area;
import java.util.Map;

/**
 * Regra determinística de "onde focar" (FR-004..FR-006). Precedência:
 * amostra insuficiente em todas → área não praticada → menor acerto entre as
 * áreas com amostra mínima. Taxas comparadas como frações exatas (multiplicação
 * cruzada) para empates reproduzíveis; desempate por menos respostas e, por
 * fim, pela ordem do enum {@link Area}.
 */
final class FocusRecommender {

    static final int MIN_SAMPLE = 10;

    private FocusRecommender() {
    }

    static Recommendation recommend(Map<Area, Counts> byArea) {
        boolean anySample = false;
        Area notPracticed = null;
        for (Area area : Area.values()) {
            Counts counts = byArea.getOrDefault(area, Counts.ZERO);
            anySample |= counts.answered() >= MIN_SAMPLE;
            if (counts.answered() == 0 && notPracticed == null) {
                notPracticed = area;
            }
        }
        if (!anySample) {
            return new Recommendation(null, Reason.INSUFFICIENT_DATA);
        }
        if (notPracticed != null) {
            return new Recommendation(notPracticed.slug(), Reason.NOT_PRACTICED);
        }

        Area weakest = null;
        Counts weakestCounts = null;
        for (Area area : Area.values()) {
            Counts counts = byArea.getOrDefault(area, Counts.ZERO);
            if (counts.answered() >= MIN_SAMPLE
                    && (weakest == null || isWeaker(counts, weakestCounts))) {
                weakest = area;
                weakestCounts = counts;
            }
        }
        return new Recommendation(weakest.slug(), Reason.LOWEST_ACCURACY);
    }

    /** Estritamente pior: menor fração de acerto ou, empatada, menos respostas. */
    private static boolean isWeaker(Counts candidate, Counts current) {
        long lhs = (long) candidate.correct() * current.answered();
        long rhs = (long) current.correct() * candidate.answered();
        if (lhs != rhs) {
            return lhs < rhs;
        }
        return candidate.answered() < current.answered();
    }
}
