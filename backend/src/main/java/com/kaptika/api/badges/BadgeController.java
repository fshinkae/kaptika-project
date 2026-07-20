package com.kaptika.api.badges;

import com.kaptika.api.badges.BadgeDtos.BadgeCollectionResponse;
import com.kaptika.api.profile.ProfileIdResolver;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Coleção de medalhas do estudante autenticado (FR-004/FR-005): conquistadas
 * com data e bloqueadas com objetivo + progresso X/Y. Leitura pura sobre
 * consultas indexadas (SC-005).
 */
@RestController
class BadgeController {

    private final BadgeService badgeService;
    private final ProfileIdResolver profileIdResolver;

    BadgeController(BadgeService badgeService, ProfileIdResolver profileIdResolver) {
        this.badgeService = badgeService;
        this.profileIdResolver = profileIdResolver;
    }

    @GetMapping("/me/badges")
    public BadgeCollectionResponse myBadges(@AuthenticationPrincipal Jwt jwt) {
        return badgeService.collectionFor(profileIdResolver.resolve(jwt));
    }
}
