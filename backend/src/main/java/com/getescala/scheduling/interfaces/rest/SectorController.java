package com.getescala.scheduling.interfaces.rest;

import com.getescala.scheduling.infrastructure.persistence.SectorJpaRepository;
import com.getescala.tenant.TenantContext;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/sectors")
public class SectorController {
  public record SectorResponse(String id, String locationId, String name) {}

  private final SectorJpaRepository sectorRepository;

  public SectorController(SectorJpaRepository sectorRepository) {
    this.sectorRepository = sectorRepository;
  }

  @GetMapping
  public List<SectorResponse> list(@RequestParam(required = false) String locationId) {
    UUID tenantId = currentTenantId();
    UUID locationUuid = locationId == null || locationId.isBlank() ? null : parseUuid(locationId, "locationId");
    return (locationUuid == null
        ? sectorRepository.findByTenantIdOrderByNameAsc(tenantId)
        : sectorRepository.findByTenantIdAndLocationIdOrderByNameAsc(tenantId, locationUuid)).stream()
        .map((s) -> new SectorResponse(s.getId().toString(), s.getLocationId() == null ? null : s.getLocationId().toString(), s.getName()))
        .toList();
  }

  private static UUID currentTenantId() {
    String tenantId = TenantContext.getTenantId();
    if (tenantId == null || tenantId.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenant_required");
    }
    return parseUuid(tenantId, "tenantId");
  }

  private static UUID parseUuid(String value, String fieldName) {
    try {
      return UUID.fromString(value);
    } catch (Exception ex) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " is invalid");
    }
  }
}
