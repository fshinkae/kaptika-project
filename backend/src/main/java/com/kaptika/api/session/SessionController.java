package com.kaptika.api.session;

import com.kaptika.api.profile.ProfileIdResolver;
import com.kaptika.api.session.SessionDtos.AnswerRequest;
import com.kaptika.api.session.SessionDtos.AnswerResult;
import com.kaptika.api.session.SessionDtos.CreateSessionRequest;
import com.kaptika.api.session.SessionDtos.SessionResponse;
import com.kaptika.api.session.SessionDtos.SessionSummary;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Ciclo de vida da sessão do estudante autenticado. Posse estrutural:
 * toda sessão é resolvida por (id, perfil do token) — sessão alheia é 404.
 */
@RestController
@RequestMapping("/sessions")
public class SessionController {

    private final SessionService sessionService;
    private final ProfileIdResolver profileIdResolver;

    public SessionController(SessionService sessionService, ProfileIdResolver profileIdResolver) {
        this.sessionService = sessionService;
        this.profileIdResolver = profileIdResolver;
    }

    /** 201 sessão nova; 200 sessão ativa existente (criação idempotente — FR-011). */
    @PostMapping
    public ResponseEntity<SessionResponse> create(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateSessionRequest request) {
        var outcome = sessionService.createOrResume(profileIdResolver.resolve(jwt), request.area());
        return ResponseEntity.status(outcome.created() ? HttpStatus.CREATED : HttpStatus.OK)
                .body(outcome.session());
    }

    @GetMapping("/{id}")
    public SessionResponse state(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return sessionService.getState(profileIdResolver.resolve(jwt), id);
    }

    @PostMapping("/{id}/answers")
    public AnswerResult answer(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @Valid @RequestBody AnswerRequest request) {
        return sessionService.answer(profileIdResolver.resolve(jwt), id, request);
    }

    @PostMapping("/{id}/finish")
    public SessionSummary finish(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return sessionService.finish(profileIdResolver.resolve(jwt), id);
    }
}
