package com.kaptika.api.badges;

import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Concessão retroativa (FR-007): ao publicar uma medalha nova no catálogo,
 * reavalia os contadores acumulados já persistidos e concede aos elegíveis.
 * Seguro sob concorrência com o fluxo normal: a inserção ignora duplicata,
 * e quem cruzar a meta durante o backfill é coberto pelo próximo evento.
 */
@Service
public class BadgeBackfillService {

    private static final Logger log = LoggerFactory.getLogger(BadgeBackfillService.class);

    private final BadgeRepository badges;
    private final BadgeAwardRepository awards;
    private final BadgeCountersRepository counters;

    BadgeBackfillService(BadgeRepository badges, BadgeAwardRepository awards,
            BadgeCountersRepository counters) {
        this.badges = badges;
        this.awards = awards;
        this.counters = counters;
    }

    /**
     * Reavalia a medalha do slug para todos os estudantes com contadores.
     * Idempotente: repetir o backfill não duplica concessões.
     *
     * @return quantidade de concessões novas efetivadas
     */
    @Transactional
    public int backfill(String slug) {
        Badge badge = badges.findBySlug(slug)
                .orElseThrow(() -> new IllegalArgumentException("Medalha desconhecida: " + slug));

        int granted = 0;
        for (BadgeCounters profileCounters : counters.findAll()) {
            if (badge.satisfiedBy(profileCounters)) {
                granted += awards.insertIgnoringDuplicate(UUID.randomUUID(),
                        profileCounters.getProfileId(), badge.getId());
            }
        }
        log.info("Backfill da medalha {}: {} concessões retroativas", slug, granted);
        return granted;
    }
}
