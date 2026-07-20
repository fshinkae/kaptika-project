package com.kaptika.api.support;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

/**
 * Fábrica de JWTs de teste assinados com uma chave RSA local, espelhando o
 * formato do Supabase (sub = uuid, claims email/user_metadata). Permite
 * exercitar os caminhos reais de decodificação: assinatura válida, expirada
 * e adulterada — sem rede.
 */
public final class TestTokens {

    public static final RSAKey KEY = generateKey("primary");
    private static final RSAKey WRONG_KEY = generateKey("primary"); // mesmo kid, chave diferente

    private TestTokens() {
    }

    public static String valid(UUID subject) {
        return valid(subject, Map.of());
    }

    public static String valid(UUID subject, Map<String, Object> extraClaims) {
        return sign(KEY, claims(subject, extraClaims, Instant.now().plusSeconds(300)));
    }

    /** Expirado além da tolerância de 60s de clock skew. */
    public static String expired(UUID subject) {
        return sign(KEY, claims(subject, Map.of(), Instant.now().minusSeconds(3600)));
    }

    /** Assinado por outra chave com o mesmo kid → falha de assinatura. */
    public static String tampered(UUID subject) {
        return sign(WRONG_KEY, claims(subject, Map.of(), Instant.now().plusSeconds(300)));
    }

    private static JWTClaimsSet claims(UUID subject, Map<String, Object> extra, Instant expiresAt) {
        JWTClaimsSet.Builder builder = new JWTClaimsSet.Builder()
                .subject(subject.toString())
                .issuer("https://test.supabase.co/auth/v1")
                .audience("authenticated")
                .issueTime(Date.from(Instant.now().minusSeconds(5)))
                .expirationTime(Date.from(expiresAt));
        extra.forEach(builder::claim);
        return builder.build();
    }

    private static String sign(RSAKey key, JWTClaimsSet claims) {
        try {
            SignedJWT jwt = new SignedJWT(
                    new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(key.getKeyID()).build(),
                    claims);
            jwt.sign(new RSASSASigner(key));
            return jwt.serialize();
        } catch (JOSEException e) {
            throw new IllegalStateException("Falha ao assinar JWT de teste", e);
        }
    }

    private static RSAKey generateKey(String kid) {
        try {
            return new RSAKeyGenerator(2048).keyID(kid).generate();
        } catch (JOSEException e) {
            throw new IllegalStateException("Falha ao gerar chave RSA de teste", e);
        }
    }
}
