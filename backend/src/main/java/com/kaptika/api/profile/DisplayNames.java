package com.kaptika.api.profile;

import java.util.Map;
import org.springframework.security.oauth2.jwt.Jwt;

/** Deriva o nome de exibição inicial a partir das claims do Supabase. */
final class DisplayNames {

    static final String FALLBACK = "Estudante";
    static final int MIN_LENGTH = 2;
    static final int MAX_LENGTH = 40;

    private DisplayNames() {
    }

    /**
     * Ordem de preferência: user_metadata.name/full_name → parte local do
     * e-mail → "Estudante". Sempre normalizado para 2–40 caracteres.
     */
    static String initialFrom(Jwt jwt) {
        Map<String, Object> metadata = jwt.getClaim("user_metadata");
        if (metadata != null) {
            String fromMetadata = firstText(metadata.get("name"), metadata.get("full_name"));
            String normalized = normalize(fromMetadata);
            if (normalized != null) {
                return normalized;
            }
        }
        String email = jwt.getClaimAsString("email");
        if (email != null && email.contains("@")) {
            String normalized = normalize(email.substring(0, email.indexOf('@')));
            if (normalized != null) {
                return normalized;
            }
        }
        return FALLBACK;
    }

    private static String firstText(Object... candidates) {
        for (Object candidate : candidates) {
            if (candidate instanceof String s && !s.isBlank()) {
                return s;
            }
        }
        return null;
    }

    private static String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.length() < MIN_LENGTH) {
            return null;
        }
        return trimmed.length() > MAX_LENGTH ? trimmed.substring(0, MAX_LENGTH).trim() : trimmed;
    }
}
