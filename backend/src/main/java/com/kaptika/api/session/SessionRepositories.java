package com.kaptika.api.session;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface QuestionRepository extends JpaRepository<Question, UUID> {

    boolean existsBySourceId(String sourceId);

    /**
     * Sorteia questões da área excluindo as que o estudante acertou nos
     * últimos 30 dias (não-repetição best-effort) e as já usadas na exclusão
     * explícita. ORDER BY random() é aceitável no acervo do MVP.
     */
    @Query(value = """
            select q.* from questions q
            where q.area = :area
              and q.id not in (
                  select a.question_id from answers a
                  join study_sessions s on s.id = a.session_id
                  where s.profile_id = :profileId
                    and a.correct
                    and a.answered_at > now() - interval '30 days')
            order by random()
            limit :limit
            """, nativeQuery = true)
    List<Question> pickForSession(@Param("area") String area,
            @Param("profileId") UUID profileId,
            @Param("limit") int limit);

    long countByArea(Area area);
}

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

    Optional<Answer> findBySessionIdAndQuestionId(UUID sessionId, UUID questionId);

    long countBySessionIdAndQuestionIdIn(UUID sessionId, Collection<UUID> questionIds);
}
