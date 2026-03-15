package com.getescala.config;

import jakarta.validation.ConstraintViolationException;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {
  private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

  public record ApiErrorResponse(int status, String message, String errorId) {}

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiErrorResponse> handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {
    String message = ex.getBindingResult().getFieldErrors().stream()
        .findFirst()
        .map((err) -> err.getDefaultMessage() == null ? "Dados inválidos" : err.getDefaultMessage())
        .orElse("Dados inválidos");
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ApiErrorResponse(400, message, null));
  }

  @ExceptionHandler(ConstraintViolationException.class)
  public ResponseEntity<ApiErrorResponse> handleConstraintViolation(ConstraintViolationException ex) {
    String message = ex.getConstraintViolations().stream()
        .findFirst()
        .map((v) -> v.getMessage() == null ? "Dados inválidos" : v.getMessage())
        .orElse("Dados inválidos");
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ApiErrorResponse(400, message, null));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<ApiErrorResponse> handleDataIntegrity(DataIntegrityViolationException ex) {
    String causeMessage = null;
    if (ex.getMostSpecificCause() != null) {
      causeMessage = ex.getMostSpecificCause().getMessage();
    }
    if (causeMessage != null && causeMessage.contains("users_email_global_key")) {
      return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiErrorResponse(409, "Já existe uma conta com este e-mail.", null));
    }
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(new ApiErrorResponse(409, "Não foi possível concluir a operação. Verifique os dados e tente novamente.", null));
  }

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<ApiErrorResponse> handleResponseStatus(ResponseStatusException ex) {
    HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
    int code = status == null ? 500 : status.value();
    String message = ex.getReason();
    if (message == null || message.isBlank()) {
      message = status == null ? "Erro" : status.getReasonPhrase();
    }
    return ResponseEntity.status(code).body(new ApiErrorResponse(code, message, null));
  }

  @ExceptionHandler(ErrorResponseException.class)
  public ResponseEntity<ApiErrorResponse> handleErrorResponseException(ErrorResponseException ex) {
    HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
    int code = status == null ? 500 : status.value();
    String message = ex.getMessage();
    if (message == null || message.isBlank()) {
      message = status == null ? "Erro" : status.getReasonPhrase();
    }
    return ResponseEntity.status(code).body(new ApiErrorResponse(code, message, null));
  }

  @ExceptionHandler(NoResourceFoundException.class)
  public ResponseEntity<ApiErrorResponse> handleNoResourceFound(NoResourceFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiErrorResponse(404, "Não encontrado", null));
  }

  @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
  public ResponseEntity<ApiErrorResponse> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
    return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(new ApiErrorResponse(405, "Método não permitido", null));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiErrorResponse> handleUnexpected(Exception ex) {
    String errorId = UUID.randomUUID().toString();
    log.error("Unhandled errorId={}", errorId, ex);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(new ApiErrorResponse(500, "Erro interno. Tente novamente.", errorId));
  }
}
