package com.kaptika.api.streak;

import java.time.Clock;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Infra da feature 004: relógio injetável (substituído nos testes por um
 * clock mutável — SC-004) e agendamento habilitado para o job de
 * reconciliação (FR-006).
 */
@Configuration(proxyBeanMethods = false)
@EnableScheduling
@EnableConfigurationProperties(StreakProperties.class)
public class StreakConfig {

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}
