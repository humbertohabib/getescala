package com.getescala.settings.interfaces.rest;

import com.getescala.security.Authz;
import com.getescala.settings.infrastructure.persistence.BonusRuleJpaEntity;
import com.getescala.settings.infrastructure.persistence.BonusRuleJpaRepository;
import com.getescala.tenant.TenantContext;
import java.util.List;
import java.util.Set;
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
@RequestMapping("/api/settings/bonuses")
public class BonusRuleSettingsController {
  private static final Set<String> VALID_VALUE_KINDS = Set.of("CURRENCY", "PERCENT");
  private static final Set<String> VALID_BONUS_TYPES = Set.of(
      "PERCENT_PER_SHIFT",
      "ADDITIONAL_PER_SHIFT",
      "PERCENT_PER_MONTH",
      "ADDITIONAL_PER_MONTH",
      "FIXED_PER_MONTH"
  );

  private final BonusRuleJpaRepository bonusRuleRepository;

  public record BonusRuleResponse(
      String id,
      String name,
      String valueKind,
      Integer valueCents,
      Integer valueBps,
      String bonusType
  ) {}

  public record CreateBonusRuleRequest(
      String name,
      String valueKind,
      Integer valueCents,
      Integer valueBps,
      String bonusType
  ) {}

  public record UpdateBonusRuleRequest(
      String name,
      String valueKind,
      Integer valueCents,
      Integer valueBps,
      String bonusType
  ) {}

  public BonusRuleSettingsController(BonusRuleJpaRepository bonusRuleRepository) {
    this.bonusRuleRepository = bonusRuleRepository;
  }

  @GetMapping
  public List<BonusRuleResponse> list() {
    UUID tenantId = requireTenantId();
    return bonusRuleRepository.findByTenantIdOrderByNameAsc(tenantId).stream()
        .map(BonusRuleSettingsController::toResponse)
        .toList();
  }

  @PostMapping
  public BonusRuleResponse create(Authentication authentication, @RequestBody CreateBonusRuleRequest request) {
    Authz.requireRole(authentication, "ADMIN");
    UUID tenantId = requireTenantId();
    ValidatedBonusRule validated = validate(request == null ? null : request.name(), request == null ? null : request.valueKind(),
        request == null ? null : request.valueCents(), request == null ? null : request.valueBps(), request == null ? null : request.bonusType());

    BonusRuleJpaEntity saved = bonusRuleRepository.save(new BonusRuleJpaEntity(
        tenantId,
        validated.name(),
        validated.valueKind(),
        validated.valueCents(),
        validated.valueBps(),
        validated.bonusType()
    ));
    return toResponse(saved);
  }

  @PutMapping("/{id}")
  public BonusRuleResponse update(
      Authentication authentication,
      @PathVariable("id") String id,
      @RequestBody UpdateBonusRuleRequest request
  ) {
    Authz.requireRole(authentication, "ADMIN");
    UUID tenantId = requireTenantId();
    UUID ruleId = parseUuid(id, "invalid_id");

    BonusRuleJpaEntity entity = bonusRuleRepository.findByTenantIdAndId(tenantId, ruleId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));

    ValidatedBonusRule validated = validate(request == null ? null : request.name(), request == null ? null : request.valueKind(),
        request == null ? null : request.valueCents(), request == null ? null : request.valueBps(), request == null ? null : request.bonusType());

    entity.updateDetails(validated.name(), validated.valueKind(), validated.valueCents(), validated.valueBps(), validated.bonusType());
    BonusRuleJpaEntity saved = bonusRuleRepository.save(entity);
    return toResponse(saved);
  }

  @DeleteMapping("/{id}")
  public void delete(Authentication authentication, @PathVariable("id") String id) {
    Authz.requireRole(authentication, "ADMIN");
    UUID tenantId = requireTenantId();
    UUID ruleId = parseUuid(id, "invalid_id");

    BonusRuleJpaEntity entity = bonusRuleRepository.findByTenantIdAndId(tenantId, ruleId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));
    bonusRuleRepository.delete(entity);
  }

  private record ValidatedBonusRule(String name, String valueKind, Integer valueCents, Integer valueBps, String bonusType) {}

  private static ValidatedBonusRule validate(
      String name,
      String valueKind,
      Integer valueCents,
      Integer valueBps,
      String bonusType
  ) {
    if (name == null || name.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name_required");
    String normalizedKind = valueKind == null ? null : valueKind.trim().toUpperCase();
    if (normalizedKind == null || normalizedKind.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "value_kind_required");
    if (!VALID_VALUE_KINDS.contains(normalizedKind)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_value_kind");

    String normalizedBonusType = bonusType == null ? null : bonusType.trim().toUpperCase();
    if (normalizedBonusType == null || normalizedBonusType.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "bonus_type_required");
    if (!VALID_BONUS_TYPES.contains(normalizedBonusType)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_bonus_type");

    Integer normalizedCents = null;
    Integer normalizedBps = null;

    if ("CURRENCY".equals(normalizedKind)) {
      if (valueCents == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "value_required");
      if (valueCents < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "value_invalid");
      normalizedCents = valueCents;
    } else if ("PERCENT".equals(normalizedKind)) {
      if (valueBps == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "value_required");
      if (valueBps < 0 || valueBps > 10000) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "value_invalid");
      normalizedBps = valueBps;
    }

    return new ValidatedBonusRule(name.trim(), normalizedKind, normalizedCents, normalizedBps, normalizedBonusType);
  }

  private static BonusRuleResponse toResponse(BonusRuleJpaEntity entity) {
    return new BonusRuleResponse(
        entity.getId().toString(),
        entity.getName(),
        entity.getValueKind(),
        entity.getValueCents(),
        entity.getValueBps(),
        entity.getBonusType()
    );
  }

  private UUID requireTenantId() {
    String raw = TenantContext.getTenantId();
    if (raw == null || raw.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenant_required");
    return parseUuid(raw, "tenant_invalid");
  }

  private UUID parseUuid(String raw, String code) {
    try {
      return UUID.fromString(raw);
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, code);
    }
  }
}
