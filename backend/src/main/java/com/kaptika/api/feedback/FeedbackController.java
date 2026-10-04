package com.kaptika.api.feedback;

import com.kaptika.api.profile.ProfileIdResolver;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/** Análise de IA de uma sessão encerrada do estudante autenticado (008). */
@RestController
public class FeedbackController {

    public record FeedbackResponse(String text) {
    }

    private final FeedbackService feedback;
    private final ProfileIdResolver profileIdResolver;

    public FeedbackController(FeedbackService feedback, ProfileIdResolver profileIdResolver) {
        this.feedback = feedback;
        this.profileIdResolver = profileIdResolver;
    }

    @PostMapping("/sessions/{id}/feedback")
    public FeedbackResponse analyze(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return new FeedbackResponse(feedback.analyze(profileIdResolver.resolve(jwt), id));
    }
}
