package com.kaptika.api.xp;

import com.kaptika.api.profile.ProfileIdResolver;
import com.kaptika.api.xp.XpDtos.XpSummaryResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * XP do próprio estudante (FR-006). Posse estrutural: o perfil é sempre
 * resolvido a partir do sub do token — não existe rota para XP de terceiros.
 */
@RestController
public class XpController {

    private final XpQueryService queryService;
    private final ProfileIdResolver profileIdResolver;

    public XpController(XpQueryService queryService, ProfileIdResolver profileIdResolver) {
        this.queryService = queryService;
        this.profileIdResolver = profileIdResolver;
    }

    @GetMapping("/me/xp")
    public XpSummaryResponse myXp(@AuthenticationPrincipal Jwt jwt) {
        return queryService.summaryFor(profileIdResolver.resolve(jwt));
    }
}
