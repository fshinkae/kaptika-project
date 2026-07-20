package com.kaptika.api.profile;

import com.kaptika.api.common.InvalidRequestDataException;
import com.kaptika.api.profile.progress.ProgressSummaryProvider;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {

    private final ProfileRepository repository;
    private final ProgressSummaryProvider progressProvider;

    public ProfileService(ProfileRepository repository, ProgressSummaryProvider progressProvider) {
        this.repository = repository;
        this.progressProvider = progressProvider;
    }

    /**
     * Provisiona o perfil no primeiro acesso e registra o último acesso nos
     * demais — idempotente sob concorrência (FR-004, FR-009, SC-003).
     */
    @Transactional
    public void ensureProfile(UUID supabaseId, String initialDisplayName) {
        repository.upsertProvisioning(supabaseId, initialDisplayName);
    }

    /** Perfil + agregados do estudante autenticado (FR-005). */
    @Transactional(readOnly = true)
    public ProfileResponse getOwnProfile(UUID supabaseId) {
        Profile profile = requireProfile(supabaseId);
        return ProfileResponse.from(profile, progressProvider.summaryFor(profile.getId()));
    }

    /** Atualização parcial do próprio perfil, com validação (FR-006, FR-007). */
    @Transactional
    public ProfileResponse updateOwnProfile(UUID supabaseId, UpdateProfileRequest request) {
        Profile profile = requireProfile(supabaseId);
        if (request.displayName() != null) {
            profile.setDisplayName(normalizedDisplayName(request.displayName()));
        }
        if (request.avatarUrl() != null) {
            profile.setAvatarUrl(request.avatarUrl().isBlank() ? null : request.avatarUrl().trim());
        }
        return ProfileResponse.from(profile, progressProvider.summaryFor(profile.getId()));
    }

    private Profile requireProfile(UUID supabaseId) {
        return repository.findBySupabaseId(supabaseId)
                .orElseThrow(() -> new IllegalStateException(
                        "Perfil ausente para sujeito autenticado — provisionamento falhou"));
    }

    private String normalizedDisplayName(String raw) {
        String trimmed = raw.trim();
        if (trimmed.length() < DisplayNames.MIN_LENGTH || trimmed.length() > DisplayNames.MAX_LENGTH) {
            throw new InvalidRequestDataException(
                    "displayName: nome de exibição deve ter entre 2 e 40 caracteres");
        }
        return trimmed;
    }
}
