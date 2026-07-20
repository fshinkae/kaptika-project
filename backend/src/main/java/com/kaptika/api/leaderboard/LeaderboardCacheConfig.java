package com.kaptika.api.leaderboard;

import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Cache das páginas do ranking (FR-009): TTL curto (padrão 60 s) implementa a
 * política de atualização periódica fixada na spec. A posição própria nunca
 * passa por aqui — é sempre calculada na hora.
 */
@Configuration
@EnableCaching
public class LeaderboardCacheConfig {

    @Bean
    CacheManager cacheManager(
            @Value("${kaptika.leaderboard.cache-ttl:60s}") Duration ttl) {
        CaffeineCacheManager manager = new CaffeineCacheManager("leaderboard-page");
        manager.setCaffeine(Caffeine.newBuilder()
                .expireAfterWrite(ttl)
                .maximumSize(1_000));
        return manager;
    }
}
