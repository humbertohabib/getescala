package com.getescala.scheduling.interfaces.rest;

import com.getescala.scheduling.infrastructure.persistence.ScheduleTemplateShiftJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.ShiftJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.ShiftTypeJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.ShiftTypeJpaRepository;
import com.getescala.security.Authz;
import com.getescala.tenant.TenantContext;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/settings/shift-types")
public class ShiftTypeSettingsController {
  private final ShiftTypeJpaRepository shiftTypeRepository;
  private final ShiftJpaRepository shiftRepository;
  private final ScheduleTemplateShiftJpaRepository templateShiftRepository;

  public record ShiftTypeResponse(String id, String code, String name, String color, boolean system) {}

  public record CreateShiftTypeRequest(String name, String color) {}

  public record UpdateShiftTypeRequest(String name, String color) {}

  public ShiftTypeSettingsController(
      ShiftTypeJpaRepository shiftTypeRepository,
      ShiftJpaRepository shiftRepository,
      ScheduleTemplateShiftJpaRepository templateShiftRepository
  ) {
    this.shiftTypeRepository = shiftTypeRepository;
    this.shiftRepository = shiftRepository;
    this.templateShiftRepository = templateShiftRepository;
  }

  @GetMapping
  public List<ShiftTypeResponse> list() {
    UUID tenantId = requireTenantId();
    ensureDefaults(tenantId);
    return shiftTypeRepository.findByTenantIdOrderByNameAsc(tenantId).stream().map(ShiftTypeSettingsController::toResponse).toList();
  }

  @PostMapping
  public ShiftTypeResponse create(Authentication authentication, @RequestBody CreateShiftTypeRequest request) {
    Authz.requireRole(authentication, "ADMIN");
    UUID tenantId = requireTenantId();
    ensureDefaults(tenantId);

    String name = request == null ? null : request.name();
    if (name == null || name.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name_required");
    String code = normalizeCode(name);
    if ("NORMAL".equals(code)) throw new ResponseStatusException(HttpStatus.CONFLICT, "normal_is_system");
    if (shiftTypeRepository.existsByTenantIdAndCode(tenantId, code)) throw new ResponseStatusException(HttpStatus.CONFLICT, "code_exists");

    ShiftTypeJpaEntity saved = shiftTypeRepository.save(new ShiftTypeJpaEntity(tenantId, code, name.trim(), blankToNull(request.color()), false));
    return toResponse(saved);
  }

  @PutMapping("/{id}")
  public ShiftTypeResponse update(Authentication authentication, @PathVariable("id") String id, @RequestBody UpdateShiftTypeRequest request) {
    Authz.requireRole(authentication, "ADMIN");
    UUID tenantId = requireTenantId();
    ensureDefaults(tenantId);

    UUID typeId = parseUuid(id, "invalid_id");
    ShiftTypeJpaEntity entity = shiftTypeRepository.findByTenantIdAndId(tenantId, typeId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));

    if (entity.isSystem() || "NORMAL".equals(entity.getCode())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "normal_is_system");
    }

    String name = request == null ? null : request.name();
    if (name == null || name.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name_required");
    entity.setName(name.trim());
    entity.setColor(blankToNull(request.color()));
    ShiftTypeJpaEntity saved = shiftTypeRepository.save(entity);
    return toResponse(saved);
  }

  @DeleteMapping("/{id}")
  public void delete(Authentication authentication, @PathVariable("id") String id) {
    Authz.requireRole(authentication, "ADMIN");
    UUID tenantId = requireTenantId();
    ensureDefaults(tenantId);

    UUID typeId = parseUuid(id, "invalid_id");
    ShiftTypeJpaEntity entity = shiftTypeRepository.findByTenantIdAndId(tenantId, typeId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));

    if (entity.isSystem() || "NORMAL".equals(entity.getCode())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "normal_is_system");
    }

    if (shiftRepository.existsByTenantIdAndKind(tenantId, entity.getCode())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "type_in_use");
    }
    if (templateShiftRepository.existsByTenantIdAndKind(tenantId, entity.getCode())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "type_in_use");
    }

    shiftTypeRepository.delete(entity);
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

  private static UUID parseUuid(String raw, String code) {
    try {
      return UUID.fromString(raw);
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, code);
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

  private static String normalizeCode(String name) {
    String trimmed = name.trim().toUpperCase();
    String normalized = trimmed.replace(' ', '_');
    normalized = normalized.replaceAll("[^A-Z0-9_]", "");
    if (normalized.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_code");
    return normalized;
  }

  private static String blankToNull(String value) {
    if (value == null) return null;
    String trimmed = value.trim();
    return trimmed.isBlank() ? null : trimmed;
  }
}
