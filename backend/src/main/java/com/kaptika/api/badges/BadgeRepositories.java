package com.kaptika.api.badges;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/*
 * Repositórios da feature 005. As escritas sensíveis a corrida usam SQL
 * nativo com ON CONFLICT DO NOTHING: idempotência garantida no banco sem
 * marcar a transação como rollback-only (FR-003, SC-002).
 */

interface BadgeRepository extends JpaRepository<Badge, UUID> {

    List<Badge> findAllByOrderBySortOrder();

    Optional<Badge> findBySlug(String slug);
}

interface BadgeAwardRepository extends JpaRepository<BadgeAward, UUID> {

    List<BadgeAward> findByProfileId(UUID profileId);

    int countByProfileId(UUID profileId);

    /**
     * Concessão à prova de corrida: a UNIQUE (profile_id, badge_id) e o
     * ON CONFLICT DO NOTHING garantem no máximo uma linha por par.
     *
     * @return 1 se concedeu agora; 0 se já estava concedida
     */
    @Modifying
    @Query(value = """
            insert into badge_awards (id, profile_id, badge_id)
            values (:id, :profileId, :badgeId)
            on conflict (profile_id, badge_id) do nothing
            """, nativeQuery = true)
    int insertIgnoringDuplicate(@Param("id") UUID id,
            @Param("profileId") UUID profileId, @Param("badgeId") UUID badgeId);
}

interface BadgeCountersRepository extends JpaRepository<BadgeCounters, UUID> {

    /** Garante a linha do estudante (defaults zerados) sem corrida. */
    @Modifying
    @Query(value = """
            insert into badge_counters (profile_id)
            values (:profileId)
            on conflict (profile_id) do nothing
            """, nativeQuery = true)
    int ensureRow(@Param("profileId") UUID profileId);

    /** Lock pessimista: serializa eventos concorrentes do mesmo perfil. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from BadgeCounters c where c.profileId = :profileId")
    Optional<BadgeCounters> lockByProfileId(@Param("profileId") UUID profileId);
}

interface ProcessedBadgeEventRepository extends JpaRepository<ProcessedBadgeEvent, String> {

    /**
     * Dedupe do evento (SC-002): primeiro passo do processamento.
     *
     * @return 1 se o evento é novo; 0 se já foi processado (no-op)
     */
    @Modifying
    @Query(value = """
            insert into processed_badge_events (idempotency_key)
            values (:key)
            on conflict (idempotency_key) do nothing
            """, nativeQuery = true)
    int markProcessed(@Param("key") String key);
}
