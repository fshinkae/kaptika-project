package com.kaptika.api.session;

import com.kaptika.api.events.CorrectAnswerRecorded;
import com.kaptika.api.events.SessionCompleted;
import com.kaptika.api.session.source.QuestionSource;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.IntStream;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.context.event.EventListener;

/**
 * Infra de teste da feature 002: fonte de questões determinística (sem rede)
 * e sonda que registra os eventos de domínio publicados.
 *
 * Acervo do stub por área (fixo, para cenários determinísticos):
 *  - LINGUAGENS: 30 questões | CIENCIAS_HUMANAS: 21 | CIENCIAS_NATUREZA: 25
 *  - MATEMATICA: 3 (cenário de acervo insuficiente — FR-013)
 * Gabarito de toda questão de teste: alternativa "A".
 */
@TestConfiguration(proxyBeanMethods = false)
public class SessionTestSupport {

    public static final String CORRECT = "A";

    public static int stockFor(Area area) {
        return switch (area) {
            case LINGUAGENS -> 30;
            case CIENCIAS_HUMANAS -> 21;
            case CIENCIAS_NATUREZA -> 25;
            case MATEMATICA -> 3;
        };
    }

    @Bean
    @Primary
    QuestionSource stubQuestionSource() {
        return (area, limit) -> {
            List<Question> stock = new ArrayList<>();
            IntStream.rangeClosed(1, stockFor(area))
                    .forEach(i -> stock.add(fixtureQuestion(area, i)));
            return stock.subList(0, Math.min(limit, stock.size()));
        };
    }

    public static Question fixtureQuestion(Area area, int index) {
        return new Question(
                "test-" + area.slug() + "-" + index,
                area,
                "Enunciado " + index + " de " + area.slug(),
                "Contexto " + index,
                CORRECT,
                2020,
                List.of(
                        new Question.Alternative("A", "Alternativa correta"),
                        new Question.Alternative("B", "Distrator 1"),
                        new Question.Alternative("C", "Distrator 2"),
                        new Question.Alternative("D", "Distrator 3"),
                        new Question.Alternative("E", "Distrator 4")));
    }

    @Bean
    EventProbe eventProbe() {
        return new EventProbe();
    }

    /** Registra os eventos de domínio para asserções (SC-003). */
    public static class EventProbe {

        public final List<CorrectAnswerRecorded> correctAnswers = new CopyOnWriteArrayList<>();
        public final List<SessionCompleted> completedSessions = new CopyOnWriteArrayList<>();

        @EventListener
        public void on(CorrectAnswerRecorded event) {
            correctAnswers.add(event);
        }

        @EventListener
        public void on(SessionCompleted event) {
            completedSessions.add(event);
        }

        public void clear() {
            correctAnswers.clear();
            completedSessions.clear();
        }
    }
}
