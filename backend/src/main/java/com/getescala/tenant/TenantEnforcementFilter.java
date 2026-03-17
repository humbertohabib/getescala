package com.getescala.tenant;

import com.google.gson.Gson;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.CorsUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class TenantEnforcementFilter extends OncePerRequestFilter {
  private static final Gson gson = new Gson();

  @Override
  protected void doFilterInternal(
      HttpServletRequest request,
      HttpServletResponse response,
      FilterChain filterChain
  ) throws ServletException, IOException {
    if (CorsUtils.isPreFlightRequest(request) || "OPTIONS".equalsIgnoreCase(request.getMethod())) {
      filterChain.doFilter(request, response);
      return;
    }

    String path = request.getRequestURI();
    if (!path.startsWith("/api/")
        || path.startsWith("/api/auth")
        || path.startsWith("/api/billing/webhook")
        || path.startsWith("/api/public")) {
      filterChain.doFilter(request, response);
      return;
    }

    if (path.startsWith("/api/system/")) {
      Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
      if (!(authentication instanceof JwtAuthenticationToken jwtAuth)) {
        writeError(request, response, HttpStatus.UNAUTHORIZED.value(), "Não autenticado");
        return;
      }

      Jwt jwt = jwtAuth.getToken();
      List<String> roles = jwt.getClaimAsStringList("roles");
      if (roles == null || !roles.contains("SUPER_ADMIN")) {
        writeError(request, response, HttpStatus.FORBIDDEN.value(), "Acesso não permitido");
        return;
      }

      filterChain.doFilter(request, response);
      return;
    }

    String tenantId = TenantContext.getTenantId();
    if (tenantId == null || tenantId.isBlank()) {
      writeError(request, response, HttpStatus.BAD_REQUEST.value(), "X-Tenant-Id é obrigatório");
      return;
    }

    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (!(authentication instanceof JwtAuthenticationToken jwtAuth)) {
      writeError(request, response, HttpStatus.UNAUTHORIZED.value(), "Não autenticado");
      return;
    }

    Jwt jwt = jwtAuth.getToken();
    String tokenTenantId = jwt.getClaimAsString("tenantId");
    if (tokenTenantId == null || !tenantId.equals(tokenTenantId)) {
      writeError(request, response, HttpStatus.FORBIDDEN.value(), "Acesso não permitido");
      return;
    }

    filterChain.doFilter(request, response);
  }

  private void writeError(HttpServletRequest request, HttpServletResponse response, int status, String message)
      throws IOException {
    if (wantsHtml(request)) {
      String html = """
          <!doctype html>
          <html lang="pt-BR">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>GetEscala API • %d</title>
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
              </style>
            </head>
            <body>
              <div class="wrap">
                <div class="card">
                  <div class="kicker">GetEscala API</div>
                  <h1>%d</h1>
                  <p>%s</p>
                  <div class="row">
                    <div class="pill">path: <code>%s</code></div>
                  </div>
                </div>
              </div>
            </body>
          </html>
          """.formatted(status, status, message, request.getRequestURI());
      response.setStatus(status);
      response.setCharacterEncoding(StandardCharsets.UTF_8.name());
      response.setContentType(MediaType.TEXT_HTML_VALUE);
      response.getWriter().write(html);
      return;
    }

    response.setStatus(status);
    response.setCharacterEncoding(StandardCharsets.UTF_8.name());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.getWriter().write(gson.toJson(new ApiError(status, message, null)));
  }

  private boolean wantsHtml(HttpServletRequest request) {
    String accept = request.getHeader("Accept");
    return accept != null && accept.contains(MediaType.TEXT_HTML_VALUE);
  }

  private record ApiError(int status, String message, String errorId) {}
}
