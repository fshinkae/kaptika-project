package com.kaptika.api.profile;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Após a autenticação, garante o perfil interno do estudante em toda
 * requisição autenticada: cria no primeiro acesso (FR-004) e atualiza o
 * último acesso nos demais (FR-009). Registrado na cadeia do servlet com
 * ordem padrão, ou seja, depois do filtro de segurança — só executa para
 * requisições já autenticadas.
 */
@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class ProfileProvisioningFilter extends OncePerRequestFilter {

    private final ProfileService profileService;

    public ProfileProvisioningFilter(ProfileService profileService) {
        this.profileService = profileService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof JwtAuthenticationToken jwtAuth) {
            UUID supabaseId = UUID.fromString(jwtAuth.getToken().getSubject());
            profileService.ensureProfile(supabaseId, DisplayNames.initialFrom(jwtAuth.getToken()));
        }
        filterChain.doFilter(request, response);
    }
}
