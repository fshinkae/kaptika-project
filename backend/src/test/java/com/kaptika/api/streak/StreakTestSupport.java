package com.kaptika.api.streak;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/**
 * Infra de teste da feature 004: relógio mutável para simular a passagem de
 * dias (e a virada de dia no fuso America/Sao_Paulo) sem sleep — o "dia" da
 * ofensiva deriva exclusivamente deste clock (SC-004).
 */
@TestConfiguration(proxyBeanMethods = false)
public class StreakTestSupport {

    /** 2026-03-10 12:00 em America/Sao_Paulo (UTC-3). */
    public static final Instant DEFAULT_NOW = Instant.parse("2026-03-10T15:00:00Z");

    @Bean
    @Primary
    MutableClock mutableClock() {
        return new MutableClock(DEFAULT_NOW);
    }

    /** Clock cujo instante pode ser reposicionado pelos testes. */
    public static class MutableClock extends Clock {

        private final AtomicReference<Instant> instant;
        private final ZoneId zone;

        public MutableClock(Instant initial) {
            this(new AtomicReference<>(initial), ZoneOffset.UTC);
        }

        private MutableClock(AtomicReference<Instant> instant, ZoneId zone) {
            this.instant = instant;
            this.zone = zone;
        }

        public void set(Instant newInstant) {
            instant.set(newInstant);
        }

        public void advanceDays(long days) {
            instant.updateAndGet(i -> i.plus(Duration.ofDays(days)));
        }

        @Override
        public ZoneId getZone() {
            return zone;
        }

        @Override
        public Clock withZone(ZoneId newZone) {
            return new MutableClock(instant, newZone); // compartilha o instante mutável
        }

        @Override
        public Instant instant() {
            return instant.get();
        }
    }
}
