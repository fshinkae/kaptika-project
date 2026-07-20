package com.kaptika.api.profile;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Perfil interno do estudante (FR-004). O id interno desambigua nomes de
 * exibição repetidos (FR-008); a linha é sempre criada pelo upsert nativo
 * do repositório, nunca por save() de entidade nova.
 */
@Entity
@Table(name = "profiles")
public class Profile {

    @Id
    private UUID id;

    @Column(name = "supabase_id", nullable = false, unique = true)
    private UUID supabaseId;

    @Column(name = "display_name", nullable = false, length = 40)
    private String displayName;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "last_access_at", nullable = false)
    private Instant lastAccessAt;

    protected Profile() {
        // JPA
    }

    public UUID getId() {
        return id;
    }

    public UUID getSupabaseId() {
        return supabaseId;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getLastAccessAt() {
        return lastAccessAt;
    }
}
