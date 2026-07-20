package com.kaptika.api.streak;

import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface StreakRepository extends JpaRepository<Streak, UUID> {

    /** Linha da ofensiva com lock pessimista — serializa eventos concorrentes (FR-010). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Streak s where s.profileId = :profileId")
    Optional<Streak> findForUpdate(@Param("profileId") UUID profileId);

    /**
     * Candidatas do job de reconciliação (FR-006): ofensivas ativas cujo
     * último cumprimento é anterior a ontem — ao menos um dia inteiro perdido.
     */
    @Query("select s from Streak s where s.currentStreak > 0 and s.lastMetDate < :cutoff")
    List<Streak> findExpiredCandidates(@Param("cutoff") LocalDate cutoff);
}

interface ActivityDayRepository extends JpaRepository<ActivityDay, ActivityDay.Key> {
}

interface StreakEventDedupeRepository extends JpaRepository<StreakEventDedupe, String> {
}
