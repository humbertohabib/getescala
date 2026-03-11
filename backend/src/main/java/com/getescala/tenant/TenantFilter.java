package com.getescala.tenant;

import java.io.IOException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class TenantFilter extends OncePerRequestFilter {
  @Override
  protected void doFilterInternal(
      HttpServletRequest request,
      HttpServletResponse response,
      FilterChain filterChain
  ) throws ServletException, IOException {
    String tenantId = request.getHeader("X-Tenant-Id");
    if (tenantId != null && !tenantId.isBlank()) {
      TenantContext.setTenantId(tenantId.trim());
    }

    try {
      filterChain.doFilter(request, response);
    } finally {
      TenantContext.clear();
    }
  }
}
