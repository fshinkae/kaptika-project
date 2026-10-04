package com.kaptika.api.feedback;

import static org.assertj.core.api.Assertions.assertThat;

import com.kaptika.api.performance.PerformanceDtos.AreaPerformance;
import com.kaptika.api.performance.PerformanceDtos.PerformanceResponse;
import com.kaptika.api.performance.PerformanceDtos.Reason;
import com.kaptika.api.performance.PerformanceDtos.Recommendation;
import com.kaptika.api.performance.PerformanceDtos.Totals;
import com.kaptika.api.session.Area;
import com.kaptika.api.session.SessionDtos.SessionReview;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Montagem do prompt compacto (FR-004, SC-001). */
class FeedbackPromptTest {

    @Test
    @DisplayName("resume sessão, histórico e foco em poucas linhas")
    void compactPrompt() {
        SessionReview review = new SessionReview(Area.MATEMATICA, false,
                Arrays.asList(true, false, true, false, null));

        String prompt = FeedbackPrompt.user(review,
                history(new Recommendation("matematica", Reason.LOWEST_ACCURACY)));

        assertThat(prompt).isEqualTo("""
                Sessão de Matemática: 2 certas de 5 (respondidas 4). Ordem: C E C E -.
                Últimos 30 dias (acertos/respondidas): Linguagens 9/12; Ciências Humanas 3/3; \
                Ciências da Natureza 0/0; Matemática 14/25.
                Foco sugerido: Matemática (menor taxa de acerto).""");
        // ~4 caracteres por token: bem abaixo de 200 tokens de entrada
        assertThat((prompt + FeedbackPrompt.SYSTEM).length()).isLessThan(600);
    }

    @Test
    @DisplayName("sem dados suficientes: omite a linha de foco")
    void noFocusWhenInsufficientData() {
        SessionReview review = new SessionReview(Area.LINGUAGENS, false, List.of(true));

        String prompt = FeedbackPrompt.user(review,
                history(new Recommendation(null, Reason.INSUFFICIENT_DATA)));

        assertThat(prompt).doesNotContain("Foco sugerido");
    }

    private static PerformanceResponse history(Recommendation recommendation) {
        return new PerformanceResponse(30, LocalDate.now(), LocalDate.now(),
                new Totals(40, 26, 14, 0.65),
                List.of(new AreaPerformance("linguagens", 12, 9, 3, 0.75),
                        new AreaPerformance("ciencias-humanas", 3, 3, 0, 1.0),
                        new AreaPerformance("ciencias-natureza", 0, 0, 0, null),
                        new AreaPerformance("matematica", 25, 14, 11, 0.56)),
                recommendation, List.of());
    }
}
