package com.kaptika.api.leaderboard;

import com.kaptika.api.leaderboard.LeaderboardDtos.LeaderboardResponse;
import com.kaptika.api.profile.ProfileIdResolver;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class LeaderboardController {

    private final LeaderboardService leaderboardService;
    private final ProfileIdResolver profileIdResolver;

    public LeaderboardController(LeaderboardService leaderboardService,
            ProfileIdResolver profileIdResolver) {
        this.leaderboardService = leaderboardService;
        this.profileIdResolver = profileIdResolver;
    }

    /** Ranking paginado + posição própria (FR-001..005, FR-007). */
    @GetMapping("/leaderboard")
    public LeaderboardResponse leaderboard(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "global") String scope,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return leaderboardService.leaderboard(profileIdResolver.resolve(jwt), scope, page, size);
    }
}
