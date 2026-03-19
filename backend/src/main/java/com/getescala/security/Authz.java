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

  public static void requirePermission(Authentication authentication, String requiredPermission) {
    if (!hasPermission(authentication, requiredPermission)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "forbidden");
    }
  }

  public static void requireAnyPermission(Authentication authentication, String... requiredPermissions) {
    if (requiredPermissions == null || requiredPermissions.length == 0) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "forbidden");
    }
    for (String p : requiredPermissions) {
      if (p != null && !p.isBlank() && hasPermission(authentication, p)) return;
    }
    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "forbidden");
  }

  public static boolean hasPermission(Authentication authentication, String permission) {
    if (!(authentication instanceof JwtAuthenticationToken jwtAuth)) return false;
    Jwt jwt = jwtAuth.getToken();
    List<String> permissions = jwt.getClaimAsStringList("permissions");
    if (permissions == null) return false;
    return permissions.contains(permission);
  }

  public static List<String> permissions(Authentication authentication) {
    if (!(authentication instanceof JwtAuthenticationToken jwtAuth)) return List.of();
    Jwt jwt = jwtAuth.getToken();
    List<String> permissions = jwt.getClaimAsStringList("permissions");
    return permissions == null ? List.of() : permissions;
  }
}
