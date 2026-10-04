package com.kaptika.api.feedback;

import com.kaptika.api.performance.PerformanceDtos.AreaPerformance;
import com.kaptika.api.performance.PerformanceDtos.PerformanceResponse;
import com.kaptika.api.performance.PerformanceDtos.Recommendation;
import com.kaptika.api.session.Area;
import com.kaptika.api.session.SessionDtos.SessionReview;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Monta o prompt da análise de forma determinística e compacta (FR-004): só
 * agregados da sessão e dos últimos 30 dias, sem enunciado nem dado pessoal.
 * Os números já vêm calculados; a IA apenas redige.
 */
final class FeedbackPrompt {

    static final String SYSTEM = "Você é tutor de ENEM. Em português do Brasil, fale com o "
            + "estudante (você) em no máximo 3 frases curtas: avalie a sessão, compare com o "
            + "histórico e dê 1 ação concreta para melhorar. Sem emoji, títulos ou listas.";

    private static final Map<Area, String> NAMES = Map.of(
            Area.LINGUAGENS, "Linguagens",
            Area.CIENCIAS_HUMANAS, "Ciências Humanas",
            Area.CIENCIAS_NATUREZA, "Ciências da Natureza",
            Area.MATEMATICA, "Matemática");

    private FeedbackPrompt() {
    }

    static String user(SessionReview review, PerformanceResponse history) {
        List<Boolean> results = review.results();
        long answered = results.stream().filter(Objects::nonNull).count();
        long correct = results.stream().filter(Boolean.TRUE::equals).count();
        String sequence = results.stream()
                .map(r -> r == null ? "-" : r ? "C" : "E")
                .collect(Collectors.joining(" "));

        StringBuilder prompt = new StringBuilder()
                .append("Sessão de ").append(NAMES.get(review.area())).append(": ")
                .append(correct).append(" certas de ").append(results.size())
                .append(" (respondidas ").append(answered).append("). Ordem: ")
                .append(sequence).append(".\nÚltimos 30 dias (acertos/respondidas): ")
                .append(history.areas().stream()
                        .map(FeedbackPrompt::describe)
                        .collect(Collectors.joining("; ")))
                .append('.');

        Recommendation focus = history.recommendation();
        if (focus.area() != null) {
            prompt.append("\nFoco sugerido: ").append(NAMES.get(Area.parse(focus.area())))
                    .append(switch (focus.reason()) {
                        case NOT_PRACTICED -> " (ainda não praticada).";
                        case LOWEST_ACCURACY -> " (menor taxa de acerto).";
                        case INSUFFICIENT_DATA -> ".";
                    });
        }
        return prompt.toString();
    }

    private static String describe(AreaPerformance area) {
        return NAMES.get(Area.parse(area.area())) + " " + area.correct() + "/" + area.answered();
    }
}
