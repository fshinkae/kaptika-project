package com.kaptika.api.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Tradução central de exceções para o formato de erro padrão (FR-012).
 * Nunca expõe stack traces ou detalhes internos ao cliente (SC-006).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /** Bean Validation no corpo da requisição → 422 com a regra violada (FR-006). */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(GlobalExceptionHandler::describe)
                .orElse("Dados inválidos.");
        return unprocessable(message);
    }

    /** Regras de validação aplicadas na camada de serviço → 422. */
    @ExceptionHandler(InvalidRequestDataException.class)
    public ResponseEntity<ApiError> handleInvalidData(InvalidRequestDataException ex) {
        return unprocessable(ex.getMessage());
    }

    /** Sessão inexistente ou de outro estudante → 404 sem vazar existência. */
    @ExceptionHandler(com.kaptika.api.session.SessionExceptions.SessionNotFoundException.class)
    public ResponseEntity<ApiError> handleSessionNotFound(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiError.of("not_found", "Recurso não encontrado."));
    }

    /** Conflitos do ciclo de vida da sessão (FR-006/007) → 409. */
    @ExceptionHandler({com.kaptika.api.session.SessionExceptions.AnswerConflictException.class,
            com.kaptika.api.session.SessionExceptions.SessionClosedException.class})
    public ResponseEntity<ApiError> handleSessionConflict(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiError.of("conflict", ex.getMessage()));
    }

    /** Fonte externa de questões indisponível (FR-012) → 503. */
    @ExceptionHandler(com.kaptika.api.session.source.QuestionSourceUnavailableException.class)
    public ResponseEntity<ApiError> handleQuestionSource(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(ApiError.of("question_source_unavailable",
                        "Fonte de questões indisponível no momento. Tente novamente."));
    }

    /** Análise pedida para sessão ainda em andamento (008) → 409. */
    @ExceptionHandler(com.kaptika.api.feedback.FeedbackExceptions.SessionNotFinishedException.class)
    public ResponseEntity<ApiError> handleSessionNotFinished(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiError.of("conflict", ex.getMessage()));
    }

    /** Limite diário de análises de IA (008) → 429. */
    @ExceptionHandler(com.kaptika.api.feedback.FeedbackExceptions.FeedbackRateLimitedException.class)
    public ResponseEntity<ApiError> handleFeedbackRateLimited(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(ApiError.of("rate_limited", ex.getMessage()));
    }

    /** Provedor de IA indisponível, sem chave ou em timeout (008) → 503. */
    @ExceptionHandler(com.kaptika.api.feedback.FeedbackExceptions.AiUnavailableException.class)
    public ResponseEntity<ApiError> handleAiUnavailable(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(ApiError.of("ai_unavailable", ex.getMessage()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleUnreadable(HttpMessageNotReadableException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiError.of("malformed_request", "Corpo da requisição malformado."));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiError.of("not_found", "Recurso não encontrado."));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiError> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(ApiError.of("method_not_allowed", "Método não suportado para este recurso."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception ex) {
        log.error("Erro inesperado [correlationId={}]", ApiError.currentCorrelationId(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiError.of("internal_error", "Erro interno inesperado."));
    }

    private static ResponseEntity<ApiError> unprocessable(String message) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(ApiError.of("validation_error", message));
    }

    private static String describe(FieldError error) {
        return error.getField() + ": " + error.getDefaultMessage();
    }
}
