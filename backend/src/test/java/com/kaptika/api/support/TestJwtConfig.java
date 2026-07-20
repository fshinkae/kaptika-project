package com.kaptika.api.support;

import com.nimbusds.jose.JOSEException;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

/**
 * Substitui o decoder de JWKS remoto por um decoder da chave pública local
 * de {@link TestTokens} — os validadores padrão (timestamp com skew) seguem
 * ativos, então expiração e assinatura são verificadas de verdade.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestJwtConfig {

    @Bean
    @Primary
    JwtDecoder testJwtDecoder() throws JOSEException {
        return NimbusJwtDecoder.withPublicKey(TestTokens.KEY.toRSAPublicKey()).build();
    }
}
