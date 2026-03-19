package com.getescala.scheduling.interfaces.rest;

import com.getescala.scheduling.infrastructure.persistence.LocationJpaRepository;
import com.getescala.tenant.TenantContext;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import com.getescala.security.Authz;

@RestController
@RequestMapping("/api/locations")
public class LocationController {
  public record LocationResponse(String id, String name) {}

  private final LocationJpaRepository locationRepository;

  public LocationController(LocationJpaRepository locationRepository) {
    this.locationRepository = locationRepository;
  }

  @GetMapping
  public List<LocationResponse> list(
      Authentication authentication,
      @RequestParam(name = "includeDisabled", required = false) String includeDisabled
  ) {
    UUID tenantId = currentTenantId();
    boolean wantsDisabled = includeDisabled != null && includeDisabled.equalsIgnoreCase("true");
    boolean canSeeDisabled = wantsDisabled && Authz.hasRole(authentication, "ADMIN");
    return (canSeeDisabled
            ? locationRepository.findByTenantIdOrderByNameAsc(tenantId)
            : locationRepository.findByTenantIdAndEnabledTrueOrderByNameAsc(tenantId))
        .stream()
        .map((l) -> new LocationResponse(l.getId().toString(), l.getName()))
        .toList();
  }

  private static UUID currentTenantId() {
    String tenantId = TenantContext.getTenantId();
    if (tenantId == null || tenantId.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenant_required");
    }
    try {
      return UUID.fromString(tenantId);
    } catch (Exception ex) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenantId is invalid");
    }
  }
}
