package com.getescala.scheduling.interfaces.rest;

import com.getescala.scheduling.infrastructure.persistence.ShiftJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.ShiftSituationJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.ShiftSituationJpaRepository;
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
@RequestMapping("/api/settings/shift-situations")
public class ShiftSituationSettingsController {
  private final ShiftSituationJpaRepository shiftSituationRepository;
  private final ShiftJpaRepository shiftRepository;

  public record ShiftSituationResponse(String id, String code, String name, boolean requiresCoverage, boolean system) {}

  public record CreateShiftSituationRequest(String name, Boolean requiresCoverage) {}

  public record UpdateShiftSituationRequest(String name, Boolean requiresCoverage) {}

  public ShiftSituationSettingsController(
      ShiftSituationJpaRepository shiftSituationRepository,
      ShiftJpaRepository shiftRepository
  ) {
    this.shiftSituationRepository = shiftSituationRepository;
    this.shiftRepository = shiftRepository;
  }

  @GetMapping
  public List<ShiftSituationResponse> list() {
    UUID tenantId = requireTenantId();
    ensureDefaults(tenantId);
    return shiftSituationRepository.findByTenantIdOrderByNameAsc(tenantId).stream().map(ShiftSituationSettingsController::toResponse).toList();
  }

  @PostMapping
  public ShiftSituationResponse create(Authentication authentication, @RequestBody CreateShiftSituationRequest request) {
    Authz.requireRole(authentication, "ADMIN");
    UUID tenantId = requireTenantId();
    ensureDefaults(tenantId);

    String name = request == null ? null : request.name();
    if (name == null || name.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name_required");
    String code = normalizeCode(name);
    if ("DESIGNADO".equals(code)) throw new ResponseStatusException(HttpStatus.CONFLICT, "designado_is_system");
    if (shiftSituationRepository.existsByTenantIdAndCode(tenantId, code)) throw new ResponseStatusException(HttpStatus.CONFLICT, "code_exists");
    if (shiftSituationRepository.existsByTenantIdAndName(tenantId, name.trim())) throw new ResponseStatusException(HttpStatus.CONFLICT, "name_exists");

    boolean requiresCoverage = request != null && Boolean.TRUE.equals(request.requiresCoverage());
    ShiftSituationJpaEntity saved = shiftSituationRepository.save(new ShiftSituationJpaEntity(tenantId, code, name.trim(), requiresCoverage, false));
    return toResponse(saved);
  }

  @PutMapping("/{id}")
  public ShiftSituationResponse update(Authentication authentication, @PathVariable("id") String id, @RequestBody UpdateShiftSituationRequest request) {
    Authz.requireRole(authentication, "ADMIN");
    UUID tenantId = requireTenantId();
    ensureDefaults(tenantId);

    UUID situationId = parseUuid(id, "invalid_id");
    ShiftSituationJpaEntity entity = shiftSituationRepository.findByTenantIdAndId(tenantId, situationId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));

    if (entity.isSystem() || "DESIGNADO".equals(entity.getCode())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "designado_is_system");
    }

    String name = request == null ? null : request.name();
    if (name == null || name.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name_required");
    String trimmedName = name.trim();
    if (!trimmedName.equals(entity.getName()) && shiftSituationRepository.existsByTenantIdAndName(tenantId, trimmedName)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "name_exists");
    }
    entity.setName(trimmedName);
    entity.setRequiresCoverage(request != null && Boolean.TRUE.equals(request.requiresCoverage()));
    ShiftSituationJpaEntity saved = shiftSituationRepository.save(entity);
    return toResponse(saved);
  }

  @DeleteMapping("/{id}")
  public void delete(Authentication authentication, @PathVariable("id") String id) {
    Authz.requireRole(authentication, "ADMIN");
    UUID tenantId = requireTenantId();
    ensureDefaults(tenantId);

    UUID situationId = parseUuid(id, "invalid_id");
    ShiftSituationJpaEntity entity = shiftSituationRepository.findByTenantIdAndId(tenantId, situationId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));

    if (entity.isSystem() || "DESIGNADO".equals(entity.getCode())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "designado_is_system");
    }
    if (shiftRepository.existsByTenantIdAndSituationCode(tenantId, entity.getCode())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "situation_in_use");
    }
    shiftSituationRepository.delete(entity);
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

  private static UUID parseUuid(String raw, String code) {
    try {
      return UUID.fromString(raw);
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, code);
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

  private static String normalizeCode(String name) {
    String trimmed = name.trim().toUpperCase();
    String normalized = trimmed.replace(' ', '_');
    normalized = normalized.replaceAll("[^A-Z0-9_]", "");
    if (normalized.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_code");
    return normalized;
  }
}
