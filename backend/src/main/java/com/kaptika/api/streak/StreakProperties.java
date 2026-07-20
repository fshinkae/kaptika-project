package com.kaptika.api.streak;

import java.time.ZoneId;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuração da ofensiva diária (FR-002/FR-011): o fuso que define a
 * "virada do dia" — compartilhável com o Placar (006) — e o cron do job
 * de reconciliação. O dia NUNCA deriva do relógio do cliente.
 */
@ConfigurationProperties(prefix = "kaptika.streak")
public record StreakProperties(String zone, String reconcileCron) {

    public StreakProperties {
        if (zone == null || zone.isBlank()) {
            zone = "America/Sao_Paulo";
        }
        if (reconcileCron == null || reconcileCron.isBlank()) {
            reconcileCron = "0 10 0 * * *";
        }
    }

    public ZoneId zoneId() {
        return ZoneId.of(zone);
    }
}
