package com.kaptika.api.session;

import com.kaptika.api.events.CorrectAnswerRecorded;
import com.kaptika.api.events.SessionCompleted;
import com.kaptika.api.session.source.QuestionSource;
import com.kaptika.api.session.source.SourcedQuestion;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
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
        return new StubQuestionSource();
    }

    /**
     * Fonte determinística sem rede. {@code fetch} entrega o acervo fixo da área;
     * {@code find} devolve a questão pelo índice (gabarito sempre "A") — imita a
     * consulta viva usada na correção/retomada.
     */
    static final class StubQuestionSource implements QuestionSource {

        @Override
        public List<SourcedQuestion> fetch(Area area, int limit) {
            List<SourcedQuestion> stock = new ArrayList<>();
            IntStream.rangeClosed(1, stockFor(area))
                    .forEach(i -> stock.add(fixtureQuestion(area, i)));
            return stock.subList(0, Math.min(limit, stock.size()));
        }

        @Override
        public Optional<SourcedQuestion> find(int year, int index) {
            // área é irrelevante na correção/exibição; devolve fixture pelo índice
            return Optional.of(fixtureQuestion(Area.LINGUAGENS, index));
        }
    }

    public static SourcedQuestion fixtureQuestion(Area area, int index) {
        return new SourcedQuestion(
                "test-" + area.slug() + "-" + index,
                area,
                "Enunciado " + index + " de " + area.slug(),
                "Contexto " + index,
                CORRECT,
                2020,
                index,
                List.of(
                        new SourcedQuestion.Alternative("A", "Alternativa correta", null),
                        new SourcedQuestion.Alternative("B", "Distrator 1", null),
                        new SourcedQuestion.Alternative("C", "Distrator 2", null),
                        new SourcedQuestion.Alternative("D", "Distrator 3", null),
                        new SourcedQuestion.Alternative("E", "Distrator 4", null)));
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
