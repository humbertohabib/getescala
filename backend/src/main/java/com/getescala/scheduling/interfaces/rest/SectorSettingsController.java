package com.getescala.scheduling.interfaces.rest;

import com.getescala.scheduling.infrastructure.persistence.LocationJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.LocationJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.ScheduleJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.SectorJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.SectorJpaRepository;
import com.getescala.security.Authz;
import com.getescala.tenant.TenantContext;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/settings/sectors")
public class SectorSettingsController {
  public record SectorResponse(String id, String locationId, String code, String name, boolean enabled) {}

  public record CreateSectorRequest(String locationId, String code, String name) {}

  public record UpdateSectorRequest(String code, String name) {}

  public record ToggleEnabledRequest(boolean enabled) {}

  private final SectorJpaRepository sectorRepository;
  private final LocationJpaRepository locationRepository;
  private final ScheduleJpaRepository scheduleRepository;

  public SectorSettingsController(
      SectorJpaRepository sectorRepository,
      LocationJpaRepository locationRepository,
      ScheduleJpaRepository scheduleRepository
  ) {
    this.sectorRepository = sectorRepository;
    this.locationRepository = locationRepository;
    this.scheduleRepository = scheduleRepository;
  }

  @PostMapping
  public SectorResponse create(Authentication authentication, @RequestBody CreateSectorRequest request) {
    Authz.requireRole(authentication, "ADMIN");
    UUID tenantId = requireTenantId();
    if (request == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_request");

    UUID locationId = parseUuid(request.locationId(), "locationId_invalid");
    LocationJpaEntity location = locationRepository.findByTenantIdAndId(tenantId, locationId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "location_not_found"));

    String name = normalizeRequiredText(request.name(), "name_required");
    String code = normalizeOptionalText(request.code());

    SectorJpaEntity entity = new SectorJpaEntity(tenantId, location.getId(), name);
    entity.setCode(code);
    entity.setEnabled(true);

    try {
      SectorJpaEntity saved = sectorRepository.save(entity);
      return toResponse(saved);
    } catch (DataIntegrityViolationException ex) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "sector_conflict");
    }
  }

  @PutMapping("/{id}")
  public SectorResponse update(
      Authentication authentication,
      @PathVariable("id") String id,
      @RequestBody UpdateSectorRequest request
  ) {
    Authz.requireRole(authentication, "ADMIN");
    UUID tenantId = requireTenantId();
    UUID sectorId = parseUuid(id, "invalid_id");
    if (request == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_request");

    SectorJpaEntity entity = sectorRepository.findByTenantIdAndId(tenantId, sectorId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));

    entity.setName(normalizeRequiredText(request.name(), "name_required"));
    entity.setCode(normalizeOptionalText(request.code()));

    try {
      SectorJpaEntity saved = sectorRepository.save(entity);
      return toResponse(saved);
    } catch (DataIntegrityViolationException ex) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "sector_conflict");
    }
  }

  @PutMapping("/{id}/enabled")
  public SectorResponse setEnabled(
      Authentication authentication,
      @PathVariable("id") String id,
      @RequestBody ToggleEnabledRequest request
  ) {
    Authz.requireRole(authentication, "ADMIN");
    UUID tenantId = requireTenantId();
    UUID sectorId = parseUuid(id, "invalid_id");
    if (request == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_request");

    SectorJpaEntity entity = sectorRepository.findByTenantIdAndId(tenantId, sectorId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));
    entity.setEnabled(request.enabled());
    SectorJpaEntity saved = sectorRepository.save(entity);
    return toResponse(saved);
  }

  @DeleteMapping("/{id}")
  public void delete(Authentication authentication, @PathVariable("id") String id) {
    Authz.requireRole(authentication, "ADMIN");
    UUID tenantId = requireTenantId();
    UUID sectorId = parseUuid(id, "invalid_id");

    SectorJpaEntity entity = sectorRepository.findByTenantIdAndId(tenantId, sectorId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));

    long schedulesCount = scheduleRepository.countByTenantIdAndSectorId(tenantId, sectorId);
    if (schedulesCount > 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "sector_in_use");

    try {
      sectorRepository.delete(entity);
    } catch (DataIntegrityViolationException ex) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "sector_in_use");
    }
  }

  private static SectorResponse toResponse(SectorJpaEntity entity) {
    return new SectorResponse(
        entity.getId().toString(),
        entity.getLocationId() == null ? null : entity.getLocationId().toString(),
        entity.getCode(),
        entity.getName(),
        entity.isEnabled()
    );
  }

  private UUID requireTenantId() {
    String raw = TenantContext.getTenantId();
    if (raw == null || raw.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenant_required");
    return parseUuid(raw, "tenant_invalid");
  }

  private static UUID parseUuid(String raw, String code) {
    try {
      return UUID.fromString(raw);
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, code);
    }
  }

  private static String normalizeRequiredText(String value, String code) {
    if (value == null || value.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, code);
    return value.trim();
  }

  private static String normalizeOptionalText(String value) {
    if (value == null) return null;
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
