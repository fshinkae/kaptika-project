package com.kaptika.api.support;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Base dos testes de integração: contexto completo + MockMvc com a cadeia
 * de filtros real (correlação, segurança, provisionamento), Postgres
 * embarcado migrado pelo Flyway e decoder JWT de chave local.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({EmbeddedPostgresConfig.class, TestJwtConfig.class})
public abstract class IntegrationTest {

    @Autowired
    protected MockMvc mockMvc;
}
