package com.kaptika.api.profile;

import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Recursos do próprio estudante. A posse é estrutural: o perfil é sempre
 * resolvido a partir do sub do token — não existe rota para dados de
 * terceiros (FR-007).
 */
@RestController
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/me")
    public ProfileResponse me(@AuthenticationPrincipal Jwt jwt) {
        return profileService.getOwnProfile(UUID.fromString(jwt.getSubject()));
    }

    @PatchMapping("/me")
    public ProfileResponse update(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpdateProfileRequest request) {
        return profileService.updateOwnProfile(UUID.fromString(jwt.getSubject()), request);
    }
}
