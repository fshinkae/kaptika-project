package com.kaptika.api.performance;

import com.kaptika.api.performance.PerformanceDtos.AreaPerformance;
import com.kaptika.api.performance.PerformanceDtos.DailyPoint;
import com.kaptika.api.performance.PerformanceDtos.PerformanceResponse;
import com.kaptika.api.performance.PerformanceDtos.Totals;
import com.kaptika.api.performance.PerformanceQueries.Counts;
import com.kaptika.api.session.Area;
import com.kaptika.api.streak.StreakProperties;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Retrato de desempenho do estudante (007). Somente leitura (FR-010): não
 * reconcilia ofensiva nem publica eventos. REPEATABLE_READ dá um único
 * snapshot às consultas, então áreas, totais e série sempre fecham entre si.
 * O "dia" usa o mesmo fuso da ofensiva (FR-008).
 */
@Service
public class PerformanceService {

    private final PerformanceQueries queries;
    private final Clock clock;
    private final ZoneId zone;

    public PerformanceService(PerformanceQueries queries, Clock clock, StreakProperties streak) {
        this.queries = queries;
        this.clock = clock;
        this.zone = streak.zoneId();
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public PerformanceResponse performanceOf(UUID profileId, String rawDays) {
        PerformanceWindow window = PerformanceWindow.of(rawDays, clock, zone);

        Map<Area, Counts> byArea = queries.answersByArea(profileId, window);
        List<AreaPerformance> areas = new ArrayList<>();
        int answered = 0;
        int correct = 0;
        for (Area area : Area.values()) {
            Counts counts = byArea.getOrDefault(area, Counts.ZERO);
            areas.add(new AreaPerformance(area.slug(), counts.answered(), counts.correct(),
                    counts.answered() - counts.correct(),
                    PerformanceDtos.accuracy(counts.answered(), counts.correct())));
            answered += counts.answered();
            correct += counts.correct();
        }
        Totals totals = new Totals(answered, correct, answered - correct,
                PerformanceDtos.accuracy(answered, correct));

        return new PerformanceResponse(window.days(), window.from(), window.to(), totals, areas,
                FocusRecommender.recommend(byArea), daily(profileId, window));
    }

    private List<DailyPoint> daily(UUID profileId, PerformanceWindow window) {
        Map<LocalDate, Counts> answers = queries.answersByDay(profileId, window, zone);
        Map<LocalDate, Long> xp = queries.xpByDay(profileId, window, zone);
        Set<LocalDate> active = queries.activeDays(profileId, window);

        List<DailyPoint> points = new ArrayList<>(window.days());
        for (LocalDate day = window.from(); !day.isAfter(window.to()); day = day.plusDays(1)) {
            Counts counts = answers.getOrDefault(day, Counts.ZERO);
            points.add(new DailyPoint(day, xp.getOrDefault(day, 0L), counts.answered(),
                    counts.correct(), active.contains(day)));
        }
        return points;
    }
}
