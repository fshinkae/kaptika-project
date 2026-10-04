package com.kaptika.api.feedback;

/**
 * Porta para o provedor de IA que redige a análise (008). Falha, timeout ou
 * IA desligada lançam {@link FeedbackExceptions.AiUnavailableException}.
 */
public interface AiFeedbackClient {

    String complete(String system, String user);
}
