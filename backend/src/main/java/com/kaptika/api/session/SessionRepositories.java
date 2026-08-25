package com.kaptika.api.session;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface StudySessionRepository extends JpaRepository<StudySession, UUID> {

    Optional<StudySession> findByProfileIdAndStatus(UUID profileId, StudySession.Status status);

    Optional<StudySession> findByIdAndProfileId(UUID id, UUID profileId);
}

interface SessionQuestionRepository extends JpaRepository<SessionQuestion, SessionQuestion.Key> {

    @Query("select sq from SessionQuestion sq where sq.key.sessionId = :sessionId order by sq.key.position")
    List<SessionQuestion> findBySessionOrdered(@Param("sessionId") UUID sessionId);
}

interface AnswerRepository extends JpaRepository<Answer, UUID> {

    List<Answer> findBySessionId(UUID sessionId);

    Optional<Answer> findBySessionIdAndSourceId(UUID sessionId, String sourceId);

    long countBySessionIdAndSourceIdIn(UUID sessionId, Collection<String> sourceIds);

    /**
     * source_ids que o estudante acertou nos últimos 30 dias — base da
     * não-repetição (aplicada em memória sobre o resultado da consulta viva).
     */
    @Query(value = """
            select distinct a.source_id from answers a
            join study_sessions s on s.id = a.session_id
            where s.profile_id = :profileId
              and a.correct
              and a.answered_at > now() - interval '30 days'
            """, nativeQuery = true)
    List<String> recentCorrectSourceIds(@Param("profileId") UUID profileId);
}
