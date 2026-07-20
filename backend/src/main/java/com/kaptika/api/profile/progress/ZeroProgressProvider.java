package com.kaptika.api.profile.progress;

import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Implementação padrão enquanto as features 003–005 não existem:
 * estudante sem progresso. Some automaticamente quando um provider
 * real for registrado.
 */
@Configuration
public class ZeroProgressProvider {

    @Bean
    @ConditionalOnMissingBean(ProgressSummaryProvider.class)
    ProgressSummaryProvider zeroProgressSummaryProvider() {
        return (UUID profileId) -> ProgressSummary.empty();
    }
}
