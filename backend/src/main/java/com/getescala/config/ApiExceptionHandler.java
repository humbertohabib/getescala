package com.getescala.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
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

  private final String appUrl;

  public ApiExceptionHandler(
      @Value("${getescala.billing.stripe.appUrl:http://localhost:5173}") String appUrl
  ) {
    this.appUrl = appUrl;
  }

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
  public ResponseEntity<?> handleNoResourceFound(NoResourceFoundException ex, HttpServletRequest request) {
    if (wantsHtml(request)) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND)
          .contentType(MediaType.TEXT_HTML)
          .body(errorHtml(404, "Não encontrado", "Este endereço não existe no backend.", request.getRequestURI(), null));
    }
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiErrorResponse(404, "Não encontrado", null));
  }

  @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
  public ResponseEntity<?> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
    if (wantsHtml(request)) {
      return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
          .contentType(MediaType.TEXT_HTML)
          .body(errorHtml(405, "Método não permitido", "Este endpoint não aceita este método HTTP.", request.getRequestURI(), null));
    }
    return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(new ApiErrorResponse(405, "Método não permitido", null));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<?> handleUnexpected(Exception ex, HttpServletRequest request) {
    String errorId = UUID.randomUUID().toString();
    log.error("Unhandled errorId={}", errorId, ex);
    if (wantsHtml(request)) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
          .contentType(MediaType.TEXT_HTML)
          .body(errorHtml(500, "Erro interno", "Ocorreu um erro inesperado no backend.", request.getRequestURI(), errorId));
    }
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(new ApiErrorResponse(500, "Erro interno. Tente novamente.", errorId));
  }

  private boolean wantsHtml(HttpServletRequest request) {
    String accept = request.getHeader("Accept");
    return accept != null && accept.contains(MediaType.TEXT_HTML_VALUE);
  }

  private String errorHtml(int status, String title, String message, String path, String errorId) {
    String safePath = path == null ? "" : path;
    String safeErrorId = errorId == null ? "" : errorId;
    String errorLine = safeErrorId.isBlank() ? "" : "<div class=\"meta\">errorId: <code>" + safeErrorId + "</code></div>";
    return """
        <!doctype html>
        <html lang="pt-BR">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>GetEscala API • %s</title>
            <style>
              :root { color-scheme: light dark; }
              body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji", "Segoe UI Emoji"; }
              .wrap { max-width: 820px; margin: 0 auto; padding: 40px 20px; }
              .card { border: 1px solid rgba(127,127,127,.25); border-radius: 14px; padding: 20px; }
              .kicker { opacity: .8; font-size: 14px; margin-bottom: 8px; }
              h1 { margin: 0 0 8px; font-size: 22px; }
              p { margin: 0 0 16px; line-height: 1.45; }
              .row { display: flex; gap: 12px; flex-wrap: wrap; }
              .pill { display: inline-flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid rgba(127,127,127,.25); border-radius: 999px; font-size: 13px; }
              code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; font-size: 12px; }
              a { color: inherit; }
              .meta { opacity: .85; font-size: 13px; margin-top: 10px; }
              .footer { opacity: .75; font-size: 13px; margin-top: 18px; }
            </style>
          </head>
          <body>
            <div class="wrap">
              <div class="card">
                <div class="kicker">GetEscala API</div>
                <h1>%d • %s</h1>
                <p>%s</p>
                <div class="row">
                  <div class="pill">path: <code>%s</code></div>
                  <div class="pill">frontend: <a href="%s">%s</a></div>
                </div>
                %s
                <div class="footer">Este servidor é um backend (API). Para usar o sistema, acesse o frontend.</div>
              </div>
            </div>
          </body>
        </html>
        """.formatted(title, status, title, message, safePath, appUrl, appUrl, errorLine);
  }
}
