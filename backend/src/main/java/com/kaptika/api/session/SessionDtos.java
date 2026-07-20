package com.kaptika.api.session;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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

    public record QuestionView(UUID questionId, int position, String statement,
            String context, List<AlternativeView> alternatives) {

        static QuestionView from(SessionQuestion sq) {
            Question q = sq.getQuestion();
            return new QuestionView(q.getId(), sq.getPosition(), q.getStatement(), q.getContext(),
                    q.getAlternatives().stream()
                            .map(a -> new AlternativeView(a.letter(), a.text()))
                            .toList());
        }
    }

    public record AlternativeView(String letter, String text) {
    }

    public record AnswerView(UUID questionId, String chosen, boolean correct) {
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
            UUID nextQuestionId) {
    }

    public record AnswerRequest(
            @NotNull(message = "questionId é obrigatório") UUID questionId,
            @NotBlank(message = "alternative é obrigatória")
            @Pattern(regexp = "^[A-Ea-e]$", message = "alternative deve ser uma letra de A a E")
            String alternative) {
    }

    public record AnswerResult(
            UUID questionId,
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
