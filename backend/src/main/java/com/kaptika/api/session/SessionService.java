package com.kaptika.api.session;

import com.kaptika.api.events.CorrectAnswerRecorded;
import com.kaptika.api.events.SessionCompleted;
import com.kaptika.api.session.SessionDtos.AnswerRequest;
import com.kaptika.api.session.SessionDtos.AnswerResult;
import com.kaptika.api.session.SessionDtos.AnswerView;
import com.kaptika.api.session.SessionDtos.QuestionView;
import com.kaptika.api.session.SessionDtos.SessionResponse;
import com.kaptika.api.session.SessionDtos.SessionSummary;
import com.kaptika.api.session.SessionExceptions.AnswerConflictException;
import com.kaptika.api.session.SessionExceptions.SessionClosedException;
import com.kaptika.api.session.SessionExceptions.SessionNotFoundException;
import com.kaptika.api.session.source.QuestionSource;
import com.kaptika.api.session.source.QuestionSourceUnavailableException;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Orquestra o ciclo de vida da sessão (FR-001..015). Eventos de domínio são
 * publicados dentro da transação de escrita; consumidores AFTER_COMMIT.
 */
@Service
public class SessionService {

    /** Resultado de criação: sessão + flag de nova (201) ou ativa reaproveitada (200). */
    public record CreationOutcome(SessionResponse session, boolean created) {
    }

    private static final Logger log = LoggerFactory.getLogger(SessionService.class);
    private static final int TARGET_QUESTIONS = 20;
    private static final Duration ACTIVE_SESSION_TTL = Duration.ofHours(24);

    private final StudySessionRepository sessions;
    private final SessionQuestionRepository sessionQuestions;
    private final QuestionRepository questions;
    private final AnswerRepository answers;
    private final QuestionSource questionSource;
    private final ApplicationEventPublisher events;

    public SessionService(StudySessionRepository sessions, SessionQuestionRepository sessionQuestions,
            QuestionRepository questions, AnswerRepository answers, QuestionSource questionSource,
            ApplicationEventPublisher events) {
        this.sessions = sessions;
        this.sessionQuestions = sessionQuestions;
        this.questions = questions;
        this.answers = answers;
        this.questionSource = questionSource;
        this.events = events;
    }

    /**
     * Cria a sessão da área (FR-001) ou devolve a ativa existente (FR-011).
     * Sessão ativa além do TTL é expirada e substituída (edge de abandono).
     */
    @Transactional
    public CreationOutcome createOrResume(UUID profileId, String areaRaw) {
        Area area = Area.parse(areaRaw);

        var active = sessions.findByProfileIdAndStatus(profileId, StudySession.Status.ACTIVE);
        if (active.isPresent()) {
            StudySession session = active.get();
            if (session.getCreatedAt().isAfter(Instant.now().minus(ACTIVE_SESSION_TTL))) {
                return new CreationOutcome(toResponse(session), false);
            }
            session.expire(Instant.now());
            sessions.saveAndFlush(session);
        }

        List<Question> picked = assembleQuestions(profileId, area);
        if (picked.isEmpty()) {
            throw new QuestionSourceUnavailableException(
                    "Sem questões disponíveis para a área no momento.");
        }

        try {
            StudySession session = sessions.saveAndFlush(new StudySession(profileId, area));
            for (int i = 0; i < picked.size(); i++) {
                sessionQuestions.save(new SessionQuestion(session.getId(), i + 1, picked.get(i)));
            }
            return new CreationOutcome(toResponse(session), true);
        } catch (DataIntegrityViolationException e) {
            // corrida com outra requisição do mesmo estudante (unique parcial ACTIVE)
            StudySession existing = sessions
                    .findByProfileIdAndStatus(profileId, StudySession.Status.ACTIVE)
                    .orElseThrow(() -> e);
            return new CreationOutcome(toResponse(existing), false);
        }
    }

    /** Estado da sessão para retomada (FR-008); 404 se não for do estudante. */
    @Transactional(readOnly = true)
    public SessionResponse getState(UUID profileId, UUID sessionId) {
        return toResponse(owned(profileId, sessionId));
    }

    /**
     * Registra a resposta com correção server-side (FR-005). Reenvio da mesma
     * alternativa é idempotente (FR-006); alterar resposta é recusado (FR-007).
     * Última questão respondida encerra a sessão (FR-009).
     */
    @Transactional
    public AnswerResult answer(UUID profileId, UUID sessionId, AnswerRequest request) {
        StudySession session = owned(profileId, sessionId);
        if (!session.isActive()) {
            throw new SessionClosedException();
        }

        List<SessionQuestion> ordered = sessionQuestions.findBySessionOrdered(sessionId);
        Question question = ordered.stream()
                .map(SessionQuestion::getQuestion)
                .filter(q -> q.getId().equals(request.questionId()))
                .findFirst()
                .orElseThrow(() -> new AnswerConflictException(
                        "A questão informada não pertence a esta sessão."));

        String chosen = request.alternative().toUpperCase();

        var existing = answers.findBySessionIdAndQuestionId(sessionId, question.getId());
        if (existing.isPresent()) {
            Answer prior = existing.get();
            if (!prior.getChosen().equalsIgnoreCase(chosen)) {
                throw new AnswerConflictException("Resposta já registrada para esta questão.");
            }
            return toResult(prior, question, session, countAnswered(session, ordered));
        }

        boolean correct = question.getCorrectAlternative().equalsIgnoreCase(chosen);
        Answer answer;
        try {
            answer = answers.saveAndFlush(new Answer(sessionId, question.getId(), chosen, correct));
        } catch (DataIntegrityViolationException e) {
            // corrida de reenvio simultâneo: converge para a resposta vencedora
            Answer prior = answers.findBySessionIdAndQuestionId(sessionId, question.getId())
                    .orElseThrow(() -> e);
            if (!prior.getChosen().equalsIgnoreCase(chosen)) {
                throw new AnswerConflictException("Resposta já registrada para esta questão.");
            }
            return toResult(prior, question, session, countAnswered(session, ordered));
        }

        session.registerAnswer(correct);

        if (correct) {
            events.publishEvent(new CorrectAnswerRecorded(profileId, sessionId, question.getId(),
                    session.getArea().name(), answer.getAnsweredAt(),
                    CorrectAnswerRecorded.keyFor(answer.getId())));
        }

        int answered = countAnswered(session, ordered);
        if (answered >= ordered.size()) {
            completeAndPublish(session, ordered.size());
        }
        return toResult(answer, question, session, answered);
    }

    /** Encerra a pedido (FR-009); idempotente — sessão fechada devolve o mesmo resumo. */
    @Transactional
    public SessionSummary finish(UUID profileId, UUID sessionId) {
        StudySession session = owned(profileId, sessionId);
        List<SessionQuestion> ordered = sessionQuestions.findBySessionOrdered(sessionId);
        if (session.isActive()) {
            completeAndPublish(session, ordered.size());
        }
        return toSummary(session, ordered.size(), countAnswered(session, ordered));
    }

    private void completeAndPublish(StudySession session, int totalQuestions) {
        session.complete(Instant.now());
        sessions.save(session);
        events.publishEvent(new SessionCompleted(session.getProfileId(), session.getId(),
                session.getArea().name(), session.getCorrectCount(), session.getWrongCount(),
                totalQuestions, session.getFinishedAt(),
                SessionCompleted.keyFor(session.getId())));
    }

    /**
     * Monta a lista de questões: cache local primeiro (excluindo acertos ≤30d),
     * busca na fonte apenas para cobrir déficit (FR-003, FR-013). Falha da
     * fonte com cache vazio → 503; com cache parcial → conduz com o disponível.
     */
    private List<Question> assembleQuestions(UUID profileId, Area area) {
        List<Question> picked = questions.pickForSession(area.name(), profileId, TARGET_QUESTIONS);
        if (picked.size() >= TARGET_QUESTIONS) {
            return picked;
        }
        try {
            int deficit = TARGET_QUESTIONS - picked.size();
            List<Question> fetched = questionSource.fetch(area, deficit * 2);
            fetched.stream()
                    .filter(q -> !questions.existsBySourceId(q.getSourceId()))
                    .forEach(questions::save);
            questions.flush();
            return questions.pickForSession(area.name(), profileId, TARGET_QUESTIONS);
        } catch (QuestionSourceUnavailableException e) {
            if (picked.isEmpty()) {
                throw e;
            }
            log.warn("enem.dev indisponível; sessão seguirá com {} questões do cache [{}]",
                    picked.size(), e.getMessage());
            return picked;
        }
    }

    private StudySession owned(UUID profileId, UUID sessionId) {
        return sessions.findByIdAndProfileId(sessionId, profileId)
                .orElseThrow(SessionNotFoundException::new);
    }

    private int countAnswered(StudySession session, List<SessionQuestion> ordered) {
        return (int) answers.countBySessionIdAndQuestionIdIn(session.getId(),
                ordered.stream().map(sq -> sq.getQuestion().getId()).collect(Collectors.toSet()));
    }

    private SessionResponse toResponse(StudySession session) {
        List<SessionQuestion> ordered = sessionQuestions.findBySessionOrdered(session.getId());
        List<Answer> given = answers.findBySessionId(session.getId());
        Set<UUID> answeredIds = given.stream().map(Answer::getQuestionId).collect(Collectors.toSet());

        UUID nextQuestionId = !session.isActive() ? null
                : ordered.stream()
                        .filter(sq -> !answeredIds.contains(sq.getQuestion().getId()))
                        .map(sq -> sq.getQuestion().getId())
                        .findFirst()
                        .orElse(null);

        return new SessionResponse(
                session.getId(),
                session.getArea().slug(),
                session.getStatus().name(),
                ordered.size(),
                given.size(),
                session.getCorrectCount(),
                session.getWrongCount(),
                session.getCreatedAt(),
                ordered.stream().map(QuestionView::from).toList(),
                given.stream().map(a -> new AnswerView(a.getQuestionId(), a.getChosen(), a.isCorrect())).toList(),
                nextQuestionId);
    }

    private AnswerResult toResult(Answer answer, Question question, StudySession session, int answered) {
        return new AnswerResult(question.getId(), answer.getChosen(), answer.isCorrect(),
                question.getCorrectAlternative(), answered,
                sessionQuestions.findBySessionOrdered(session.getId()).size(),
                session.getStatus().name());
    }

    private SessionSummary toSummary(StudySession session, int total, int answered) {
        return new SessionSummary(session.getId(), session.getArea().slug(),
                session.getStatus().name(), session.getCorrectCount(), session.getWrongCount(),
                total, answered, session.getCreatedAt(), session.getFinishedAt());
    }
}
