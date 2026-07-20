package com.kaptika.api.profile;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Corpo de PATCH /me (FR-006). Campos nulos são ignorados (atualização
 * parcial); limites finos de nome (com trim) são aplicados no serviço.
 */
public record UpdateProfileRequest(
        @Size(max = 40, message = "nome de exibição deve ter entre 2 e 40 caracteres")
        String displayName,

        @Size(max = 500, message = "avatar deve ter no máximo 500 caracteres")
        @Pattern(regexp = "^$|^https?://.+", message = "avatar deve ser uma URL http(s)")
        String avatarUrl) {
}
