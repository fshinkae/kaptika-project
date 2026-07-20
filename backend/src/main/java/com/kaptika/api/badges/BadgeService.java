package com.kaptika.api.badges;

import com.kaptika.api.badges.BadgeDtos.BadgeCollectionResponse;
import com.kaptika.api.badges.BadgeDtos.BadgeView;
import com.kaptika.api.badges.BadgeDtos.Progress;
import com.kaptika.api.events.CorrectAnswerRecorded;
import com.kaptika.api.events.SessionCompleted;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Núcleo da feature 005: consome os eventos da 002 em transação própria
 * (REQUIRES_NEW — os ouvintes AFTER_COMMIT rodam fora da transação de
 * origem), mantém os contadores acumulados do estudante e avalia o catálogo,
 * concedendo medalhas de forma única (FR-001..003).
 *
 * Isolamento: XP e streak são derivações PRÓPRIAS dos eventos da 002
 * (10 XP por acerto, curva 100×N ⇒ nível 5 = 1000 XP; dias locais
 * consecutivos com sessão concluída) — nada é lido das features 003/004.
 */
@Service
public class BadgeService {

    /** XP creditado por questão correta (derivação própria da 005). */
    public static final int XP_PER_CORRECT_ANSWER = 10;

    /** Fuso fixo das regras de dia da feature (streak de dias consecutivos). */
    public static final ZoneId BADGE_TIME_ZONE = ZoneId.of("America/Sao_Paulo");

    private static final Logger log = LoggerFactory.getLogger(BadgeService.class);

    private final BadgeRepository badges;
    private final BadgeAwardRepository awards;
    private final BadgeCountersRepository counters;
    private final ProcessedBadgeEventRepository processedEvents;

    BadgeService(BadgeRepository badges, BadgeAwardRepository awards,
            BadgeCountersRepository counters, ProcessedBadgeEventRepository processedEvents) {
        this.badges = badges;
        this.awards = awards;
        this.counters = counters;
        this.processedEvents = processedEvents;
    }

    /** Acerto de questão: +1 correta, +10 XP, reavaliação do catálogo. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onCorrectAnswer(CorrectAnswerRecorded event) {
        if (alreadyProcessed(event.idempotencyKey())) {
            return;
        }
        BadgeCounters profileCounters = lockedCounters(event.profileId());
        profileCounters.applyCorrectAnswer(XP_PER_CORRECT_ANSWER);
        evaluateAndAward(event.profileId(), profileCounters);
    }

    /** Sessão concluída: total, área explorada, streak; reavaliação do catálogo. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onSessionCompleted(SessionCompleted event) {
        if (alreadyProcessed(event.idempotencyKey())) {
            return;
        }
        BadgeCounters profileCounters = lockedCounters(event.profileId());
        profileCounters.applySessionCompleted(areaBit(event.area()),
                LocalDate.ofInstant(event.completedAt(), BADGE_TIME_ZONE));
        evaluateAndAward(event.profileId(), profileCounters);
    }

    /** Contagem de medalhas do estudante — serviço público para a 001 (FR-010). */
    @Transactional(readOnly = true)
    public int countFor(UUID profileId) {
        return awards.countByProfileId(profileId);
    }

    /** Coleção completa: conquistadas com data, bloqueadas com progresso (FR-004/005). */
    @Transactional(readOnly = true)
    public BadgeCollectionResponse collectionFor(UUID profileId) {
        Map<UUID, Instant> awardedAt = awards.findByProfileId(profileId).stream()
                .collect(Collectors.toMap(BadgeAward::getBadgeId, BadgeAward::getAwardedAt));
        BadgeCounters profileCounters = counters.findById(profileId).orElse(null);

        List<BadgeView> views = badges.findAllByOrderBySortOrder().stream()
                .map(badge -> toView(badge, awardedAt.get(badge.getId()), profileCounters))
                .toList();
        return new BadgeCollectionResponse(views, awardedAt.size(), views.size());
    }

    /**
     * Avalia todo o catálogo contra os contadores e concede as satisfeitas
     * ainda não concedidas (SC-001). Corrida é neutralizada duas vezes: o
     * chamador segura o lock do perfil e a inserção ignora duplicata.
     */
    private void evaluateAndAward(UUID profileId, BadgeCounters profileCounters) {
        var owned = awards.findByProfileId(profileId).stream()
                .map(BadgeAward::getBadgeId)
                .collect(Collectors.toSet());
        for (Badge badge : badges.findAll()) {
            if (!owned.contains(badge.getId()) && badge.satisfiedBy(profileCounters)) {
                awards.insertIgnoringDuplicate(UUID.randomUUID(), profileId, badge.getId());
                log.info("Medalha {} concedida ao perfil {}", badge.getSlug(), profileId);
            }
        }
    }

    private boolean alreadyProcessed(String idempotencyKey) {
        return processedEvents.markProcessed(idempotencyKey) == 0;
    }

    private BadgeCounters lockedCounters(UUID profileId) {
        counters.ensureRow(profileId);
        return counters.lockByProfileId(profileId)
                .orElseThrow(() -> new IllegalStateException(
                        "Contadores ausentes após upsert — inconsistência inesperada"));
    }

    private static BadgeView toView(Badge badge, Instant awardedAt, BadgeCounters profileCounters) {
        boolean achieved = awardedAt != null;
        long current = achieved
                ? badge.getThreshold()
                : Math.min(badge.getConditionType().currentValue(profileCounters), badge.getThreshold());
        return new BadgeView(badge.getSlug(), badge.getName(), badge.getDescription(),
                achieved, awardedAt, new Progress(current, badge.getThreshold()));
    }

    /** Bit da área do ENEM no areas_mask; desconhecida → 0 (ignorada). */
    static int areaBit(String area) {
        return switch (area == null ? "" : area) {
            case "LINGUAGENS" -> 1;
            case "CIENCIAS_HUMANAS" -> 1 << 1;
            case "CIENCIAS_NATUREZA" -> 1 << 2;
            case "MATEMATICA" -> 1 << 3;
            default -> {
                log.warn("Área desconhecida em evento consumido pela 005: {}", area);
                yield 0;
            }
        };
    }
}
