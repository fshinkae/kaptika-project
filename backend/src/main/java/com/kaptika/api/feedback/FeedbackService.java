package com.kaptika.api.feedback;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.kaptika.api.feedback.FeedbackExceptions.FeedbackRateLimitedException;
import com.kaptika.api.feedback.FeedbackExceptions.SessionNotFinishedException;
import com.kaptika.api.performance.PerformanceService;
import com.kaptika.api.session.SessionDtos.SessionReview;
import com.kaptika.api.session.SessionService;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.stereotype.Service;

/**
 * Análise de IA da sessão encerrada (008). Nada é persistido (FR-006): um
 * cache curto por sessão evita cobrar de novo em retry/duplo clique, e um
 * contador diário por estudante limita o custo (FR-007). As leituras do banco
 * terminam antes da chamada à IA — nenhuma transação fica aberta durante a
 * espera pelo provedor (FR-009).
 */
@Service
public class FeedbackService {

    private static final String HISTORY_DAYS = "30";

    private final SessionService sessions;
    private final PerformanceService performance;
    private final AiFeedbackClient ai;
    private final int dailyLimit;
    private final Cache<UUID, String> recent = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofMinutes(10))
            .maximumSize(10_000)
            .build();
    private final Cache<UUID, AtomicInteger> usage = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofDays(1))
            .maximumSize(100_000)
            .build();

    public FeedbackService(SessionService sessions, PerformanceService performance,
            AiFeedbackClient ai, AiProperties properties) {
        this.sessions = sessions;
        this.performance = performance;
        this.ai = ai;
        this.dailyLimit = properties.dailyLimit();
    }

    public String analyze(UUID profileId, UUID sessionId) {
        SessionReview review = sessions.reviewOf(profileId, sessionId);
        if (review.active()) {
            throw new SessionNotFinishedException();
        }
        String cached = recent.getIfPresent(sessionId);
        if (cached != null) {
            return cached;
        }
        AtomicInteger used = usage.get(profileId, id -> new AtomicInteger());
        if (used.incrementAndGet() > dailyLimit) {
            throw new FeedbackRateLimitedException();
        }
        String prompt = FeedbackPrompt.user(review,
                performance.performanceOf(profileId, HISTORY_DAYS));
        String text;
        try {
            text = ai.complete(FeedbackPrompt.SYSTEM, prompt);
        } catch (RuntimeException e) {
            used.decrementAndGet(); // falha do provedor não consome a cota do estudante
            throw e;
        }
        recent.put(sessionId, text);
        return text;
    }
}
