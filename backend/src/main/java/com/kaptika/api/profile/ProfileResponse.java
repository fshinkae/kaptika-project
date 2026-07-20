package com.kaptika.api.profile;

import com.kaptika.api.profile.progress.ProgressSummary;
import java.time.Instant;
import java.util.UUID;

/** Contrato de resposta de GET/PATCH /me (FR-005). */
public record ProfileResponse(UUID id, String displayName, String avatarUrl,
        Instant createdAt, ProgressSummary progress) {

    static ProfileResponse from(Profile profile, ProgressSummary progress) {
        return new ProfileResponse(profile.getId(), profile.getDisplayName(),
                profile.getAvatarUrl(), profile.getCreatedAt(), progress);
    }
}
