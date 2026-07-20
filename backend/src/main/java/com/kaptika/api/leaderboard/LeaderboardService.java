package com.kaptika.api.leaderboard;

import com.kaptika.api.common.InvalidRequestDataException;
import com.kaptika.api.leaderboard.LeaderboardDtos.LeaderboardResponse;
import com.kaptika.api.leaderboard.LeaderboardDtos.MyPosition;
import com.kaptika.api.leaderboard.LeaderboardDtos.Page;
import com.kaptika.api.leaderboard.LeaderboardDtos.Scope;
import com.kaptika.api.xp.XpQueryService;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Compõe a página (cacheada) com a posição própria (sempre fresca) —
 * o estudante nunca vê a si mesmo defasado, mesmo dentro do TTL (FR-003).
 */
@Service
public class LeaderboardService {

    static final int MAX_PAGE_SIZE = 100;

    private final LeaderboardPageService pages;
    private final LeaderboardQueries queries;

    public LeaderboardService(LeaderboardPageService pages, LeaderboardQueries queries) {
        this.pages = pages;
        this.queries = queries;
    }

    @Transactional(readOnly = true)
    public LeaderboardResponse leaderboard(UUID profileId, String scopeRaw, int page, int size) {
        Scope scope = Scope.parse(scopeRaw);
        if (page < 0) {
            throw new InvalidRequestDataException("page: deve ser maior ou igual a 0");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new InvalidRequestDataException("size: deve estar entre 1 e " + MAX_PAGE_SIZE);
        }

        Page data = pages.page(scope, page, size);
        MyPosition me = (scope == Scope.WEEKLY
                ? queries.weeklyPositionOf(profileId, XpQueryService.currentPeriodStart())
                : queries.globalPositionOf(profileId))
                .orElse(new MyPosition(0, 0));

        return new LeaderboardResponse(data.scope(), data.periodStart(), data.page(),
                data.size(), data.totalStudents(), data.entries(), me);
    }
}
