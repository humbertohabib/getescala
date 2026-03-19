package com.getescala.scheduling.interfaces.rest;

import com.getescala.scheduling.infrastructure.persistence.ShiftTypeJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.ShiftTypeJpaRepository;
import com.getescala.tenant.TenantContext;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class ShiftTypeController {
  private final ShiftTypeJpaRepository shiftTypeRepository;

  public record ShiftTypeResponse(String id, String code, String name, String color, boolean system) {}

  public ShiftTypeController(ShiftTypeJpaRepository shiftTypeRepository) {
    this.shiftTypeRepository = shiftTypeRepository;
  }

  @GetMapping("/api/shift-types")
  public List<ShiftTypeResponse> list() {
    UUID tenantId = requireTenantId();
    ensureDefaults(tenantId);
    return shiftTypeRepository.findByTenantIdOrderByNameAsc(tenantId).stream().map(ShiftTypeController::toResponse).toList();
  }

  private static ShiftTypeResponse toResponse(ShiftTypeJpaEntity entity) {
    return new ShiftTypeResponse(
        entity.getId().toString(),
        entity.getCode(),
        entity.getName(),
        entity.getColor(),
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
    ensureDefault(tenantId, "NORMAL", "Normal", "#64748b", true);
    ensureDefault(tenantId, "NOTURNO", "Noturno", "#4f46e5", false);
    ensureDefault(tenantId, "FIM_DE_SEMANA", "Fim de semana", "#f97316", false);
    ensureDefault(tenantId, "FERIADO", "Feriado", "#dc2626", false);
    ensureDefault(tenantId, "OUTRO", "Outro", "#0f172a", false);
  }

  private void ensureDefault(UUID tenantId, String code, String name, String color, boolean system) {
    if (shiftTypeRepository.existsByTenantIdAndCode(tenantId, code)) return;
    shiftTypeRepository.save(new ShiftTypeJpaEntity(tenantId, code, name, color, system));
  }
}
