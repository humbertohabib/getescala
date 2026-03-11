package com.getescala.identity.interfaces.rest;

import com.getescala.tenant.TenantContext;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/me")
public class MeController {
  public record MeResponse(String userId, String tenantId, List<String> roles) {}

  @GetMapping
  public MeResponse me(Authentication authentication) {
    if (!(authentication instanceof JwtAuthenticationToken jwtAuth)) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "unauthorized");
    }

    Jwt jwt = jwtAuth.getToken();
    String userId = jwt.getSubject();
    String tenantId = TenantContext.getTenantId();
    if (tenantId == null || tenantId.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenant_required");
    }

    List<String> roles = jwt.getClaimAsStringList("roles");
    return new MeResponse(userId, tenantId, roles == null ? List.of() : roles);
  }
}
