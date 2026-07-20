package com.kaptika.api.profile;

import java.util.UUID;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/**
 * Traduz o sub do JWT (supabase_id) para o id interno do perfil — a chave
 * usada pelas demais features (sessões, XP, streak, medalhas).
 * O perfil sempre existe aqui: o ProfileProvisioningFilter roda antes.
 */
@Component
public class ProfileIdResolver {

    private final ProfileRepository repository;

    public ProfileIdResolver(ProfileRepository repository) {
        this.repository = repository;
    }

    public UUID resolve(Jwt jwt) {
        return repository.findBySupabaseId(UUID.fromString(jwt.getSubject()))
                .orElseThrow(() -> new IllegalStateException(
                        "Perfil ausente para sujeito autenticado — provisionamento falhou"))
                .getId();
    }
}
