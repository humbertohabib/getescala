package com.getescala.security;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;

public final class Authz {
  private Authz() {}

  public static void requireRole(Authentication authentication, String requiredRole) {
    if (!hasRole(authentication, requiredRole)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "forbidden");
    }
  }

  public static void requireAnyRole(Authentication authentication, String... requiredRoles) {
    if (requiredRoles == null || requiredRoles.length == 0) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "forbidden");
    }
    for (String role : requiredRoles) {
      if (role != null && !role.isBlank() && hasRole(authentication, role)) return;
    }
    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "forbidden");
  }

  public static boolean hasRole(Authentication authentication, String role) {
    if (!(authentication instanceof JwtAuthenticationToken jwtAuth)) return false;
    Jwt jwt = jwtAuth.getToken();
    List<String> roles = jwt.getClaimAsStringList("roles");
    if (roles == null) return false;
    return roles.contains(role);
  }
}
