package com.getescala.scheduling.interfaces.rest;

import com.getescala.scheduling.infrastructure.persistence.SectorJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.SectorJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.ShiftJpaRepository;
import com.getescala.tenant.TenantContext;
import com.getescala.workforce.infrastructure.persistence.ProfessionalJpaEntity;
import com.getescala.workforce.infrastructure.persistence.ProfessionalJpaRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/sectors")
public class SectorController {
  public record SectorResponse(String id, String locationId, String name) {}
  public record SectorProfessionalResponse(String id, String fullName, String email, String phone, String status) {}

  private final SectorJpaRepository sectorRepository;
  private final ShiftJpaRepository shiftRepository;
  private final ProfessionalJpaRepository professionalRepository;

  public SectorController(
      SectorJpaRepository sectorRepository,
      ShiftJpaRepository shiftRepository,
      ProfessionalJpaRepository professionalRepository
  ) {
    this.sectorRepository = sectorRepository;
    this.shiftRepository = shiftRepository;
    this.professionalRepository = professionalRepository;
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

  @GetMapping("/{id}/professionals")
  public List<SectorProfessionalResponse> listProfessionals(@PathVariable("id") String id) {
    UUID tenantId = currentTenantId();
    UUID sectorId = parseUuid(id, "id");
    SectorJpaEntity sector = sectorRepository.findById(sectorId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "sector_not_found"));
    if (!sector.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "sector_forbidden");
    }

    List<UUID> professionalIds = shiftRepository.findDistinctProfessionalIdsByTenantIdAndSectorId(tenantId, sectorId);
    if (professionalIds.isEmpty()) return List.of();

    return professionalRepository.findByTenantIdAndIdInOrderByFullNameAsc(tenantId, professionalIds).stream()
        .map(SectorController::toProfessionalResponse)
        .toList();
  }

  private static SectorProfessionalResponse toProfessionalResponse(ProfessionalJpaEntity entity) {
    return new SectorProfessionalResponse(
        entity.getId().toString(),
        entity.getFullName(),
        entity.getEmail(),
        entity.getPhone(),
        entity.getStatus()
    );
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
