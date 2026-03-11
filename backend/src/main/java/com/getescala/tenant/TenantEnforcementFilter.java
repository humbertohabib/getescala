package com.getescala.tenant;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class TenantEnforcementFilter extends OncePerRequestFilter {
  @Override
  protected void doFilterInternal(
      HttpServletRequest request,
      HttpServletResponse response,
      FilterChain filterChain
  ) throws ServletException, IOException {
    String path = request.getRequestURI();
    if (!path.startsWith("/api/") || path.startsWith("/api/auth/")) {
      filterChain.doFilter(request, response);
      return;
    }

    String tenantId = TenantContext.getTenantId();
    if (tenantId == null || tenantId.isBlank()) {
      response.setStatus(HttpStatus.BAD_REQUEST.value());
      return;
    }

    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (!(authentication instanceof JwtAuthenticationToken jwtAuth)) {
      response.setStatus(HttpStatus.UNAUTHORIZED.value());
      return;
    }

    Jwt jwt = jwtAuth.getToken();
    String tokenTenantId = jwt.getClaimAsString("tenantId");
    if (tokenTenantId == null || !tenantId.equals(tokenTenantId)) {
      response.setStatus(HttpStatus.FORBIDDEN.value());
      return;
    }

    filterChain.doFilter(request, response);
  }
}
