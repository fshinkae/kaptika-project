package com.kaptika.api.leaderboard;

import com.kaptika.api.leaderboard.LeaderboardDtos.Page;
import com.kaptika.api.leaderboard.LeaderboardDtos.Scope;
import com.kaptika.api.xp.XpQueryService;
import java.time.Instant;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Página do ranking com cache TTL (política periódica — FR-009).
 * Serviço separado do de composição para o @Cacheable passar pelo proxy.
 */
@Service
public class LeaderboardPageService {

    private final LeaderboardQueries queries;

    public LeaderboardPageService(LeaderboardQueries queries) {
        this.queries = queries;
    }

    @Cacheable(cacheNames = "leaderboard-page",
            key = "#scope.name() + ':' + #page + ':' + #size")
    @Transactional(readOnly = true)
    public Page page(Scope scope, int page, int size) {
        int offset = page * size;
        if (scope == Scope.WEEKLY) {
            Instant periodStart = XpQueryService.currentPeriodStart();
            return new Page("weekly", periodStart, page, size, queries.totalStudents(),
                    queries.weeklyPage(periodStart, size, offset));
        }
        return new Page("global", null, page, size, queries.totalStudents(),
                queries.globalPage(size, offset));
    }
}
