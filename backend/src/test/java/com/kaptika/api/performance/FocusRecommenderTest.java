package com.kaptika.api.performance;

import static org.assertj.core.api.Assertions.assertThat;

import com.kaptika.api.performance.PerformanceDtos.Reason;
import com.kaptika.api.performance.PerformanceDtos.Recommendation;
import com.kaptika.api.performance.PerformanceQueries.Counts;
import com.kaptika.api.session.Area;
import java.util.EnumMap;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Regra "onde focar" (FR-004..FR-006, SC-002). */
class FocusRecommenderTest {

    @Test
    @DisplayName("nenhuma área com amostra mínima → INSUFFICIENT_DATA, sem área")
    void insufficientData() {
        Recommendation r = FocusRecommender.recommend(counts(
                Area.MATEMATICA, 9, 1,
                Area.LINGUAGENS, 5, 5));

        assertThat(r.reason()).isEqualTo(Reason.INSUFFICIENT_DATA);
        assertThat(r.area()).isNull();
    }

    @Test
    @DisplayName("estudante sem respostas → INSUFFICIENT_DATA")
    void noAnswersAtAll() {
        assertThat(FocusRecommender.recommend(Map.of()).reason())
                .isEqualTo(Reason.INSUFFICIENT_DATA);
    }

    @Test
    @DisplayName("com amostra em alguma área, a primeira área não praticada (ordem do enum) vence")
    void notPracticed() {
        Recommendation r = FocusRecommender.recommend(counts(
                Area.LINGUAGENS, 10, 2,
                Area.MATEMATICA, 3, 0));

        assertThat(r.reason()).isEqualTo(Reason.NOT_PRACTICED);
        assertThat(r.area()).isEqualTo("ciencias-humanas");
    }

    @Test
    @DisplayName("todas praticadas → menor taxa de acerto entre as com amostra mínima")
    void lowestAccuracy() {
        Recommendation r = FocusRecommender.recommend(counts(
                Area.LINGUAGENS, 20, 16,
                Area.CIENCIAS_HUMANAS, 10, 9,
                Area.CIENCIAS_NATUREZA, 12, 6,
                Area.MATEMATICA, 15, 7));

        assertThat(r.reason()).isEqualTo(Reason.LOWEST_ACCURACY);
        assertThat(r.area()).isEqualTo("matematica"); // 7/15 < 6/12
    }

    @Test
    @DisplayName("área abaixo da amostra mínima não vence, mesmo com acerto menor")
    void belowSampleIsIgnored() {
        Recommendation r = FocusRecommender.recommend(counts(
                Area.LINGUAGENS, 20, 10,
                Area.CIENCIAS_HUMANAS, 10, 8,
                Area.CIENCIAS_NATUREZA, 12, 11,
                Area.MATEMATICA, 9, 0));

        assertThat(r.area()).isEqualTo("linguagens");
    }

    @Test
    @DisplayName("mesma fração → menos respostas vence")
    void tieBrokenByFewerAnswers() {
        Recommendation r = FocusRecommender.recommend(counts(
                Area.LINGUAGENS, 20, 10,
                Area.CIENCIAS_HUMANAS, 10, 5,
                Area.CIENCIAS_NATUREZA, 12, 11,
                Area.MATEMATICA, 30, 15));

        assertThat(r.area()).isEqualTo("ciencias-humanas");
    }

    @Test
    @DisplayName("empate total → ordem do enum Area")
    void fullTieBrokenByEnumOrder() {
        Recommendation r = FocusRecommender.recommend(counts(
                Area.LINGUAGENS, 10, 9,
                Area.CIENCIAS_HUMANAS, 10, 5,
                Area.CIENCIAS_NATUREZA, 10, 9,
                Area.MATEMATICA, 10, 5));

        assertThat(r.area()).isEqualTo("ciencias-humanas");
    }

    private static Map<Area, Counts> counts(Object... triples) {
        Map<Area, Counts> map = new EnumMap<>(Area.class);
        for (int i = 0; i < triples.length; i += 3) {
            map.put((Area) triples[i], new Counts((int) triples[i + 1], (int) triples[i + 2]));
        }
        return map;
    }
}
