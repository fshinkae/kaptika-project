package com.kaptika.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Configuração da integração com o Supabase Auth (FR-010). */
@ConfigurationProperties(prefix = "kaptika.supabase")
public record SupabaseProperties(String jwksUri) {
}
