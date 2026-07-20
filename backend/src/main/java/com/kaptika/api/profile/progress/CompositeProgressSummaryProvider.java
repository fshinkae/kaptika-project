package com.kaptika.api.profile.progress;

import com.kaptika.api.badges.BadgeService;
import com.kaptika.api.streak.StreakService;
import com.kaptika.api.xp.XpDtos.XpSummaryResponse;
import com.kaptika.api.xp.XpQueryService;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Composição dos agregados reais do perfil (FR-005 da 001): XP e nível da
 * feature 003, ofensiva da 004 (leitura sem efeitos colaterais) e contagem
 * de medalhas da 005. Substitui o provider zero usado durante o
 * desenvolvimento incremental.
 */
@Component
public class CompositeProgressSummaryProvider implements ProgressSummaryProvider {

    private final XpQueryService xp;
    private final StreakService streaks;
    private final BadgeService badges;

    public CompositeProgressSummaryProvider(XpQueryService xp, StreakService streaks,
            BadgeService badges) {
        this.xp = xp;
        this.streaks = streaks;
        this.badges = badges;
    }

    @Override
    public ProgressSummary summaryFor(UUID profileId) {
        XpSummaryResponse xpSummary = xp.summaryFor(profileId);
        return new ProgressSummary(
                xpSummary.xpTotal(),
                xpSummary.level(),
                xpSummary.xpToNextLevel(),
                streaks.peekCurrent(profileId),
                badges.countFor(profileId));
    }
}
