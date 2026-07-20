package com.kaptika.api.leaderboard;

import com.kaptika.api.leaderboard.LeaderboardDtos.Entry;
import com.kaptika.api.leaderboard.LeaderboardDtos.MyPosition;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

/**
 * Consultas nativas de ranking (FR-001, FR-006, FR-008). A expressão de
 * ordenação é única e total — xp DESC, atingiu-o-total-primeiro ASC
 * (NULLS LAST: quem nunca pontuou vai ao fim), id ASC — o que garante
 * desempate reproduzível (SC-006) e paginação estável (SC-004).
 * Estudantes com 0 XP aparecem (LEFT JOIN de profiles).
 */
@Repository
class LeaderboardQueries {

    private static final String GLOBAL_RANKED = """
            select p.id, p.display_name, coalesce(b.xp_total, 0) as xp,
                   row_number() over (order by coalesce(b.xp_total, 0) desc,
                                               b.updated_at asc nulls last,
                                               p.id asc) as rk
            from profiles p
            left join xp_balances b on b.profile_id = p.id
            """;

    private static final String WEEKLY_RANKED = """
            with wxp as (
                select profile_id, sum(amount) as xp, max(granted_at) as last_at
                from xp_grants
                where granted_at >= ?
                group by profile_id
            )
            select p.id, p.display_name, coalesce(w.xp, 0) as xp,
                   row_number() over (order by coalesce(w.xp, 0) desc,
                                               w.last_at asc nulls last,
                                               p.id asc) as rk
            from profiles p
            left join wxp w on w.profile_id = p.id
            """;

    private static final RowMapper<Entry> ENTRY_MAPPER = (rs, i) -> new Entry(
            rs.getLong("rk"), rs.getObject("id", UUID.class),
            rs.getString("display_name"), rs.getLong("xp"));

    private final JdbcTemplate jdbc;

    LeaderboardQueries(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    List<Entry> globalPage(int limit, int offset) {
        return jdbc.query(GLOBAL_RANKED + " order by rk limit ? offset ?",
                ENTRY_MAPPER, limit, offset);
    }

    List<Entry> weeklyPage(Instant periodStart, int limit, int offset) {
        return jdbc.query(WEEKLY_RANKED + " order by rk limit ? offset ?",
                ENTRY_MAPPER, java.sql.Timestamp.from(periodStart), limit, offset);
    }

    /** Posição própria pela mesma janela de ordenação — sempre fresca (FR-003, FR-009). */
    Optional<MyPosition> globalPositionOf(UUID profileId) {
        return positionOf("select rk, xp from (" + GLOBAL_RANKED + ") t where t.id = ?",
                profileId);
    }

    Optional<MyPosition> weeklyPositionOf(UUID profileId, Instant periodStart) {
        return jdbc.query("select rk, xp from (" + WEEKLY_RANKED + ") t where t.id = ?",
                        (rs, i) -> new MyPosition(rs.getLong("rk"), rs.getLong("xp")),
                        java.sql.Timestamp.from(periodStart), profileId)
                .stream().findFirst();
    }

    long totalStudents() {
        Long count = jdbc.queryForObject("select count(*) from profiles", Long.class);
        return count != null ? count : 0;
    }

    private Optional<MyPosition> positionOf(String sql, UUID profileId) {
        return jdbc.query(sql, (rs, i) -> new MyPosition(rs.getLong("rk"), rs.getLong("xp")),
                profileId).stream().findFirst();
    }
}
