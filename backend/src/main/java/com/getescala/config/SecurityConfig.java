package com.getescala.config;

import com.getescala.tenant.TenantEnforcementFilter;
import com.getescala.tenant.TenantFilter;
import com.google.gson.Gson;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class SecurityConfig {
  private static final Gson gson = new Gson();

  @Bean
  SecurityFilterChain securityFilterChain(
      HttpSecurity http,
      TenantFilter tenantFilter,
      TenantEnforcementFilter tenantEnforcementFilter,
      @Value("${getescala.billing.stripe.appUrl:http://localhost:5173}") String appUrl
  ) throws Exception {
    return http
        .csrf(csrf -> csrf.disable())
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .addFilterBefore(tenantFilter, UsernamePasswordAuthenticationFilter.class)
        .addFilterAfter(tenantEnforcementFilter, BearerTokenAuthenticationFilter.class)
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/actuator/health", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html")
            .permitAll()
            .requestMatchers("/api/auth/**")
            .permitAll()
            .requestMatchers("/api/billing/webhook")
            .permitAll()
            .requestMatchers("/api/public/**")
            .permitAll()
            .requestMatchers("/api/**")
            .authenticated()
            .anyRequest()
            .permitAll())
        .exceptionHandling(ex -> ex
            .authenticationEntryPoint((request, response, authException) -> {
              if (wantsHtml(request)) {
                writeHtml(response, 401, "Acesso não permitido", "Você precisa estar autenticado para acessar este endpoint.", request.getRequestURI(), appUrl);
                return;
              }
              writeJson(response, 401, "Não autenticado");
            })
            .accessDeniedHandler((request, response, accessDeniedException) -> {
              if (wantsHtml(request)) {
                writeHtml(response, 403, "Acesso não permitido", "Você não tem permissão para acessar este endpoint.", request.getRequestURI(), appUrl);
                return;
              }
              writeJson(response, 403, "Acesso não permitido");
            }))
        .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
        .build();
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  private static boolean wantsHtml(HttpServletRequest request) {
    String accept = request.getHeader("Accept");
    return accept != null && accept.contains(MediaType.TEXT_HTML_VALUE);
  }

  private static void writeJson(HttpServletResponse response, int status, String message) throws IOException {
    response.setStatus(status);
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.getWriter().write(gson.toJson(new ApiError(status, message, null)));
  }

  private static void writeHtml(
      HttpServletResponse response,
      int status,
      String title,
      String message,
      String path,
      String appUrl
  ) throws IOException {
    String safePath = path == null ? "" : path;
    String html = """
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
                <div class="footer">Este servidor é um backend (API). Para usar o sistema, acesse o frontend.</div>
              </div>
            </div>
          </body>
        </html>
        """.formatted(title, status, title, message, safePath, appUrl, appUrl);
    response.setStatus(status);
    response.setContentType(MediaType.TEXT_HTML_VALUE);
    response.getWriter().write(html);
  }

  private record ApiError(int status, String message, String errorId) {}
}
