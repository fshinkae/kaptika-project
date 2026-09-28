package com.kaptika.api.performance;

import com.kaptika.api.performance.PerformanceDtos.PerformanceResponse;
import com.kaptika.api.profile.ProfileIdResolver;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Desempenho do próprio estudante (FR-001). Posse estrutural: o perfil vem
 * sempre do sub do token — não existe rota para dados de terceiros.
 * {@code days} chega como texto para que valores não numéricos também virem
 * 422 com a regra violada (FR-009), e não 400 de conversão.
 */
@RestController
public class PerformanceController {

    private final PerformanceService performanceService;
    private final ProfileIdResolver profileIdResolver;

    public PerformanceController(PerformanceService performanceService,
            ProfileIdResolver profileIdResolver) {
        this.performanceService = performanceService;
        this.profileIdResolver = profileIdResolver;
    }

    @GetMapping("/me/performance")
    public PerformanceResponse myPerformance(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String days) {
        return performanceService.performanceOf(profileIdResolver.resolve(jwt), days);
    }
}
