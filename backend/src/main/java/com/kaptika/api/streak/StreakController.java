package com.kaptika.api.streak;

import com.kaptika.api.profile.ProfileIdResolver;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Estado da ofensiva do próprio estudante (FR-005/007/011). A posse é
 * estrutural: o perfil vem sempre do sub do token — não há rota para a
 * ofensiva de terceiros.
 */
@RestController
public class StreakController {

    private final StreakService streakService;
    private final ProfileIdResolver profileIdResolver;

    public StreakController(StreakService streakService, ProfileIdResolver profileIdResolver) {
        this.streakService = streakService;
        this.profileIdResolver = profileIdResolver;
    }

    @GetMapping("/me/streak")
    public StreakResponse me(@AuthenticationPrincipal Jwt jwt) {
        return streakService.getState(profileIdResolver.resolve(jwt));
    }
}
