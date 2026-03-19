package com.getescala.scheduling.interfaces.rest;

import com.getescala.scheduling.infrastructure.persistence.ShiftSituationJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.ShiftSituationJpaRepository;
import com.getescala.tenant.TenantContext;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class ShiftSituationController {
  private final ShiftSituationJpaRepository shiftSituationRepository;

  public record ShiftSituationResponse(String id, String code, String name, boolean requiresCoverage, boolean system) {}

  public ShiftSituationController(ShiftSituationJpaRepository shiftSituationRepository) {
    this.shiftSituationRepository = shiftSituationRepository;
  }

  @GetMapping("/api/shift-situations")
  public List<ShiftSituationResponse> list() {
    UUID tenantId = requireTenantId();
    ensureDefaults(tenantId);
    return shiftSituationRepository.findByTenantIdOrderByNameAsc(tenantId).stream().map(ShiftSituationController::toResponse).toList();
  }

  private static ShiftSituationResponse toResponse(ShiftSituationJpaEntity entity) {
    return new ShiftSituationResponse(
        entity.getId().toString(),
        entity.getCode(),
        entity.getName(),
        entity.isRequiresCoverage(),
        entity.isSystem()
    );
  }

  private UUID requireTenantId() {
    String raw = TenantContext.getTenantId();
    if (raw == null || raw.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenant_required");
    try {
      return UUID.fromString(raw);
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenant_invalid");
    }
  }

  private void ensureDefaults(UUID tenantId) {
    ensureDefault(tenantId, "DESIGNADO", "Designado", true, true);
    ensureDefault(tenantId, "FALTA_JUSTIFICADA", "Falta Justificada", true, false);
    ensureDefault(tenantId, "FALTA_NAO_JUSTIFICADA", "Falta Não Justificada", true, false);
    ensureDefault(tenantId, "FERIADO", "Feriado", false, false);
    ensureDefault(tenantId, "FERIAS", "Férias", false, false);
    ensureDefault(tenantId, "FOLGA", "Folga", false, false);
    ensureDefault(tenantId, "TROCADO", "Trocado", true, false);
  }

  private void ensureDefault(UUID tenantId, String code, String name, boolean requiresCoverage, boolean system) {
    if (shiftSituationRepository.existsByTenantIdAndCode(tenantId, code)) return;
    shiftSituationRepository.save(new ShiftSituationJpaEntity(tenantId, code, name, requiresCoverage, system));
  }
}
