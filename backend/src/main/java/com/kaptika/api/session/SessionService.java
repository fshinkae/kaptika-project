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
import com.kaptika.api.session.source.SourcedQuestion;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Orquestra o ciclo de vida da sessão (FR-001..015). As questões vêm da
 * enem.dev por CONSULTA ao vivo — nada de conteúdo/gabarito é persistido; o
 * banco guarda só referência (source_id/ano/índice) e o resultado (acerto/erro).
 * Eventos de domínio são publicados na transação de escrita; consumidores
 * AFTER_COMMIT.
 */
@Service
public class SessionService {

    /** Resultado de criação: sessão + flag de nova (201) ou ativa reaproveitada (200). */
    public record CreationOutcome(SessionResponse session, boolean created) {
    }

    private static final int TARGET_QUESTIONS = 5;
    private static final Duration ACTIVE_SESSION_TTL = Duration.ofHours(24);

    private final StudySessionRepository sessions;
    private final SessionQuestionRepository sessionQuestions;
    private final AnswerRepository answers;
    private final QuestionSource questionSource;
    private final ApplicationEventPublisher events;
    private final SessionService self;

    public SessionService(StudySessionRepository sessions, SessionQuestionRepository sessionQuestions,
            AnswerRepository answers, QuestionSource questionSource,
            ApplicationEventPublisher events, @Lazy SessionService self) {
        this.sessions = sessions;
        this.sessionQuestions = sessionQuestions;
        this.answers = answers;
        this.questionSource = questionSource;
        this.events = events;
        this.self = self;
    }

    /**
     * Cria a sessão da área (FR-001) ou devolve a ativa existente (FR-011).
     * A checagem da ativa e a criação rodam em transações separadas: assim um
     * POST concorrente que perde a corrida do índice único parcial devolve a
     * sessão ativa (200) em vez de 500 (a transação da violação fica poluída).
     */
    public CreationOutcome createOrResume(UUID profileId, String areaRaw) {
        Area area = Area.parse(areaRaw);

        Optional<StudySession> active = self.consumeActive(profileId);
        if (active.isPresent()) {
            return new CreationOutcome(toResponse(active.get()), false);
        }
        try {
            return self.createNew(profileId, area);
        } catch (DataIntegrityViolationException e) {
            StudySession existing = sessions
                    .findByProfileIdAndStatus(profileId, StudySession.Status.ACTIVE)
                    .orElseThrow(() -> e);
            return new CreationOutcome(toResponse(existing), false);
        }
    }

    /** Devolve a sessão ativa dentro do TTL; expira e descarta a abandonada. */
    @Transactional
    Optional<StudySession> consumeActive(UUID profileId) {
        var active = sessions.findByProfileIdAndStatus(profileId, StudySession.Status.ACTIVE);
        if (active.isEmpty()) {
            return Optional.empty();
        }
        StudySession session = active.get();
        if (session.getCreatedAt().isAfter(Instant.now().minus(ACTIVE_SESSION_TTL))) {
            return Optional.of(session);
        }
        session.expire(Instant.now());
        sessions.saveAndFlush(session);
        return Optional.empty();
    }

    @Transactional
    CreationOutcome createNew(UUID profileId, Area area) {
        List<SourcedQuestion> picked = assembleQuestions(profileId, area);
        if (picked.isEmpty()) {
            throw new QuestionSourceUnavailableException(
                    "Sem questões disponíveis para a área no momento.");
        }
        StudySession session = sessions.saveAndFlush(new StudySession(profileId, area));
        for (int i = 0; i < picked.size(); i++) {
            sessionQuestions.save(new SessionQuestion(session.getId(), i + 1, picked.get(i)));
        }
        sessionQuestions.flush();
        return new CreationOutcome(toResponse(session), true);
    }

    /**
     * Sessão ativa do estudante, se houver (FR-008/FR-011): permite retomar sem
     * exigir que o cliente guarde o id. Descarta a ativa fora do TTL.
     */
    public Optional<SessionResponse> findActive(UUID profileId) {
        return self.consumeActive(profileId).map(this::toResponse);
    }

    /** Estado da sessão para retomada (FR-008); 404 se não for do estudante. */
    @Transactional(readOnly = true)
    public SessionResponse getState(UUID profileId, UUID sessionId) {
        return toResponse(owned(profileId, sessionId));
    }

    /**
     * Registra a resposta com correção server-side (FR-005), consultando o
     * gabarito ao vivo na enem.dev. Reenvio da mesma alternativa é idempotente
     * (FR-006); alterar resposta é recusado (FR-007). Última questão respondida
     * encerra a sessão (FR-009).
     */
    @Transactional
    public AnswerResult answer(UUID profileId, UUID sessionId, AnswerRequest request) {
        StudySession session = owned(profileId, sessionId);
        if (!session.isActive()) {
            throw new SessionClosedException();
        }

        List<SessionQuestion> ordered = sessionQuestions.findBySessionOrdered(sessionId);
        SessionQuestion ref = ordered.stream()
                .filter(sq -> sq.getSourceId().equals(request.questionId()))
                .findFirst()
                .orElseThrow(() -> new AnswerConflictException(
                        "A questão informada não pertence a esta sessão."));

        String chosen = request.alternative().toUpperCase();
        SourcedQuestion question = resolve(ref);

        var existing = answers.findBySessionIdAndSourceId(sessionId, ref.getSourceId());
        if (existing.isPresent()) {
            Answer prior = existing.get();
            if (!prior.getChosen().equalsIgnoreCase(chosen)) {
                throw new AnswerConflictException("Resposta já registrada para esta questão.");
            }
            return toResult(prior, question, session, countAnswered(session, ordered));
        }

        boolean correct = question.correctAlternative().equalsIgnoreCase(chosen);
        Answer answer;
        try {
            answer = answers.saveAndFlush(new Answer(sessionId, ref.getSourceId(), chosen, correct));
        } catch (DataIntegrityViolationException e) {
            // corrida de reenvio simultâneo: converge para a resposta vencedora
            Answer prior = answers.findBySessionIdAndSourceId(sessionId, ref.getSourceId())
                    .orElseThrow(() -> e);
            if (!prior.getChosen().equalsIgnoreCase(chosen)) {
                throw new AnswerConflictException("Resposta já registrada para esta questão.");
            }
            return toResult(prior, question, session, countAnswered(session, ordered));
        }

        session.registerAnswer(correct);

        if (correct) {
            events.publishEvent(new CorrectAnswerRecorded(profileId, sessionId, ref.getSourceId(),
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
     * Monta a lista de questões consultando a fonte ao vivo (FR-003) e
     * excluindo os source_ids acertados nos últimos 30 dias (não-repetição —
     * FR-013). Nada é persistido aqui; falha da fonte propaga (503).
     */
    private List<SourcedQuestion> assembleQuestions(UUID profileId, Area area) {
        Set<String> recent = new HashSet<>(answers.recentCorrectSourceIds(profileId));
        List<SourcedQuestion> fetched = questionSource.fetch(area, TARGET_QUESTIONS * 2);
        List<SourcedQuestion> picked = new ArrayList<>();
        for (SourcedQuestion q : fetched) {
            if (recent.contains(q.sourceId())) {
                continue;
            }
            picked.add(q);
            if (picked.size() >= TARGET_QUESTIONS) {
                break;
            }
        }
        return picked;
    }

    /** Reconsulta o conteúdo/gabarito da referência; 503 se a fonte não devolver. */
    private SourcedQuestion resolve(SessionQuestion ref) {
        return questionSource.find(ref.getOriginYear(), ref.getQuestionIndex())
                .orElseThrow(() -> new QuestionSourceUnavailableException(
                        "Questão indisponível na fonte: " + ref.getSourceId()));
    }

    private StudySession owned(UUID profileId, UUID sessionId) {
        return sessions.findByIdAndProfileId(sessionId, profileId)
                .orElseThrow(SessionNotFoundException::new);
    }

    private int countAnswered(StudySession session, List<SessionQuestion> ordered) {
        return (int) answers.countBySessionIdAndSourceIdIn(session.getId(),
                ordered.stream().map(SessionQuestion::getSourceId).collect(Collectors.toSet()));
    }

    private SessionResponse toResponse(StudySession session) {
        List<SessionQuestion> ordered = sessionQuestions.findBySessionOrdered(session.getId());
        List<Answer> given = answers.findBySessionId(session.getId());
        Set<String> answeredIds = given.stream().map(Answer::getSourceId).collect(Collectors.toSet());

        String nextQuestionId = !session.isActive() ? null
                : ordered.stream()
                        .map(SessionQuestion::getSourceId)
                        .filter(id -> !answeredIds.contains(id))
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
                ordered.stream().map(sq -> QuestionView.from(sq, resolve(sq))).toList(),
                given.stream().map(a -> new AnswerView(a.getSourceId(), a.getChosen(), a.isCorrect())).toList(),
                nextQuestionId);
    }

    private AnswerResult toResult(Answer answer, SourcedQuestion question, StudySession session,
            int answered) {
        return new AnswerResult(answer.getSourceId(), answer.getChosen(), answer.isCorrect(),
                question.correctAlternative(), answered,
                sessionQuestions.findBySessionOrdered(session.getId()).size(),
                session.getStatus().name());
    }

    private SessionSummary toSummary(StudySession session, int total, int answered) {
        return new SessionSummary(session.getId(), session.getArea().slug(),
                session.getStatus().name(), session.getCorrectCount(), session.getWrongCount(),
                total, answered, session.getCreatedAt(), session.getFinishedAt());
    }
}
