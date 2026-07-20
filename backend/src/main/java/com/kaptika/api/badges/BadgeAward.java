package com.kaptika.api.badges;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Conquista de uma medalha por um estudante (FR-002/FR-003). Única por
 * (profile_id, badge_id) no banco; inserida sempre via
 * {@code INSERT ... ON CONFLICT DO NOTHING} — a entidade serve à leitura.
 */
@Entity
@Table(name = "badge_awards")
public class BadgeAward {

    @Id
    private UUID id;

    @Column(name = "profile_id", nullable = false)
    private UUID profileId;

    @Column(name = "badge_id", nullable = false)
    private UUID badgeId;

    @Column(name = "awarded_at", nullable = false)
    private Instant awardedAt;

    protected BadgeAward() {
        // JPA
    }

    public UUID getId() {
        return id;
    }

    public UUID getProfileId() {
        return profileId;
    }

    public UUID getBadgeId() {
        return badgeId;
    }

    public Instant getAwardedAt() {
        return awardedAt;
    }
}
