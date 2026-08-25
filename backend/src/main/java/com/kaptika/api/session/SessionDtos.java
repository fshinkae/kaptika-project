package com.kaptika.api.session;

import com.kaptika.api.session.source.SourcedQuestion;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Contratos de entrada/saída da sessão. Nenhum DTO de questão contém o
 * gabarito (FR-004, SC-006) — ele só aparece no resultado de uma resposta.
 */
public final class SessionDtos {

    private SessionDtos() {
    }

    public record CreateSessionRequest(
            @NotBlank(message = "area é obrigatória") String area) {
    }

    public record QuestionView(String questionId, int position, String statement,
            String context, List<AlternativeView> alternatives) {

        static QuestionView from(SessionQuestion sq, SourcedQuestion q) {
            return new QuestionView(sq.getSourceId(), sq.getPosition(), q.statement(), q.context(),
                    q.alternatives().stream()
                            .map(a -> new AlternativeView(a.letter(), a.text()))
                            .toList());
        }
    }

    public record AlternativeView(String letter, String text) {
    }

    public record AnswerView(String questionId, String chosen, boolean correct) {
    }

    public record SessionResponse(
            UUID id,
            String area,
            String status,
            int totalQuestions,
            int answeredCount,
            int correctCount,
            int wrongCount,
            Instant createdAt,
            List<QuestionView> questions,
            List<AnswerView> answers,
            String nextQuestionId) {
    }

    public record AnswerRequest(
            @NotBlank(message = "questionId é obrigatório") String questionId,
            @NotBlank(message = "alternative é obrigatória")
            @Pattern(regexp = "^[A-Ea-e]$", message = "alternative deve ser uma letra de A a E")
            String alternative) {
    }

    public record AnswerResult(
            String questionId,
            String chosen,
            boolean correct,
            String correctAlternative,
            int answeredCount,
            int totalQuestions,
            String sessionStatus) {
    }

    public record SessionSummary(
            UUID sessionId,
            String area,
            String status,
            int correctCount,
            int wrongCount,
            int totalQuestions,
            int answeredCount,
            Instant startedAt,
            Instant finishedAt) {
    }
}
