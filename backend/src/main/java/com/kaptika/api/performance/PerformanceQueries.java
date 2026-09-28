package com.kaptika.api.performance;

import com.kaptika.api.session.Area;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Leituras agregadas sobre dados já consolidados de 002 (answers +
 * study_sessions), 003 (xp_grants) e 004 (activity_days). Filtro da janela em
 * instantes (usa índice); conversão para dia local só no agrupamento.
 */
@Repository
class PerformanceQueries {

    record Counts(int answered, int correct) {
        static final Counts ZERO = new Counts(0, 0);
    }

    private final JdbcTemplate jdbc;

    PerformanceQueries(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    Map<Area, Counts> answersByArea(UUID profileId, PerformanceWindow window) {
        Map<Area, Counts> result = new EnumMap<>(Area.class);
        jdbc.query("""
                select s.area, count(*) as answered, count(*) filter (where a.correct) as correct
                from answers a
                join study_sessions s on s.id = a.session_id
                where s.profile_id = ? and a.answered_at >= ? and a.answered_at < ?
                group by s.area
                """,
                rs -> {
                    result.put(Area.valueOf(rs.getString("area")),
                            new Counts(rs.getInt("answered"), rs.getInt("correct")));
                },
                profileId, Timestamp.from(window.start()), Timestamp.from(window.end()));
        return result;
    }

    Map<LocalDate, Counts> answersByDay(UUID profileId, PerformanceWindow window, ZoneId zone) {
        Map<LocalDate, Counts> result = new HashMap<>();
        jdbc.query("""
                select (a.answered_at at time zone ?)::date as day,
                       count(*) as answered, count(*) filter (where a.correct) as correct
                from answers a
                join study_sessions s on s.id = a.session_id
                where s.profile_id = ? and a.answered_at >= ? and a.answered_at < ?
                group by 1
                """,
                rs -> {
                    result.put(rs.getObject("day", LocalDate.class),
                            new Counts(rs.getInt("answered"), rs.getInt("correct")));
                },
                zone.getId(), profileId,
                Timestamp.from(window.start()), Timestamp.from(window.end()));
        return result;
    }

    Map<LocalDate, Long> xpByDay(UUID profileId, PerformanceWindow window, ZoneId zone) {
        Map<LocalDate, Long> result = new HashMap<>();
        jdbc.query("""
                select (granted_at at time zone ?)::date as day, sum(amount) as xp
                from xp_grants
                where profile_id = ? and granted_at >= ? and granted_at < ?
                group by 1
                """,
                rs -> {
                    result.put(rs.getObject("day", LocalDate.class), rs.getLong("xp"));
                },
                zone.getId(), profileId,
                Timestamp.from(window.start()), Timestamp.from(window.end()));
        return result;
    }

    Set<LocalDate> activeDays(UUID profileId, PerformanceWindow window) {
        return new HashSet<>(jdbc.queryForList("""
                select local_date from activity_days
                where profile_id = ? and met and local_date between ? and ?
                """, LocalDate.class, profileId, window.from(), window.to()));
    }
}
