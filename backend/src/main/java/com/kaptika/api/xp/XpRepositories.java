package com.kaptika.api.xp;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface XpGrantRepository extends JpaRepository<XpGrant, UUID> {

    /**
     * Concessão idempotente (FR-003): a chave única uq_xp_grants_idempotency
     * decide no banco — sob concorrência, exatamente uma inserção vence.
     *
     * @return 1 se a concessão foi registrada agora; 0 se o evento já havia
     *         sido processado (SC-002) — nesse caso o saldo não deve mudar.
     */
    @Modifying
    @Query(value = """
            insert into xp_grants (profile_id, amount, source, granted_at, idempotency_key)
            values (:profileId, :amount, :source, :grantedAt, :idempotencyKey)
            on conflict (idempotency_key) do nothing
            """, nativeQuery = true)
    int insertIfAbsent(@Param("profileId") UUID profileId,
            @Param("amount") int amount,
            @Param("source") String source,
            @Param("grantedAt") Instant grantedAt,
            @Param("idempotencyKey") String idempotencyKey);

    /** Soma da trilha — usada nos testes de consistência saldo × concessões (SC-001). */
    @Query(value = "select coalesce(sum(amount), 0) from xp_grants where profile_id = :profileId",
            nativeQuery = true)
    long sumAmountFor(@Param("profileId") UUID profileId);

    /** XP do período (FR-007): concessões a partir do início da semana vigente. */
    @Query(value = """
            select coalesce(sum(amount), 0) from xp_grants
            where profile_id = :profileId and granted_at >= :from
            """, nativeQuery = true)
    long sumAmountSince(@Param("profileId") UUID profileId, @Param("from") Instant from);

    List<XpGrant> findByProfileId(UUID profileId);
}

interface XpBalanceRepository extends JpaRepository<XpBalance, UUID> {

    /**
     * Upsert atômico do saldo (FR-004, FR-009): o incremento relativo é
     * resolvido pelo banco, seguro sob concorrência — nunca sobrescreve
     * leituras concorrentes nem exige lock/retry na aplicação.
     */
    @Modifying
    @Query(value = """
            insert into xp_balances (profile_id, xp_total, updated_at)
            values (:profileId, :delta, now())
            on conflict (profile_id) do update
                set xp_total = xp_balances.xp_total + excluded.xp_total,
                    updated_at = now()
            """, nativeQuery = true)
    void addXp(@Param("profileId") UUID profileId, @Param("delta") long delta);
}
