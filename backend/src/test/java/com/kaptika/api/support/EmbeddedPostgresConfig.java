package com.kaptika.api.support;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.io.IOException;
import javax.sql.DataSource;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/**
 * Postgres real embarcado (Zonky) para os testes de integração — sem Docker.
 * O Flyway roda as migrações de produção contra ele.
 */
@TestConfiguration(proxyBeanMethods = false)
public class EmbeddedPostgresConfig {

    @Bean(destroyMethod = "close")
    EmbeddedPostgres embeddedPostgres() throws IOException {
        return EmbeddedPostgres.start();
    }

    @Bean
    @Primary
    DataSource dataSource(EmbeddedPostgres embeddedPostgres) {
        return embeddedPostgres.getPostgresDatabase();
    }
}
