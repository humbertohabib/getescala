package com.getescala.settings.interfaces.rest;

import com.getescala.security.Authz;
import com.getescala.settings.infrastructure.persistence.BonusRuleJpaEntity;
import com.getescala.settings.infrastructure.persistence.BonusRuleJpaRepository;
import com.getescala.settings.infrastructure.persistence.BonusValueJpaEntity;
import com.getescala.settings.infrastructure.persistence.BonusValueJpaRepository;
import com.getescala.settings.infrastructure.persistence.ShiftTypeValueJpaEntity;
import com.getescala.settings.infrastructure.persistence.ShiftTypeValueJpaRepository;
import com.getescala.tenant.TenantContext;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/settings/values")
public class ValuesSettingsController {
  private final ShiftTypeValueJpaRepository shiftTypeValueRepository;
  private final BonusValueJpaRepository bonusValueRepository;
  private final BonusRuleJpaRepository bonusRuleRepository;

  public record ShiftTypeValueResponse(String shiftTypeCode, Integer valueCents, String currency) {}

  public record BonusValueResponse(String bonusRuleId, String valueKind, Integer valueCents, Integer valueBps) {}

  public record ValuesResponse(
      String sectorId,
      String periodStart,
      String periodEnd,
      List<ShiftTypeValueResponse> shiftTypes,
      List<BonusValueResponse> bonuses
  ) {}

  public record ShiftTypeValueInput(String shiftTypeCode, Integer valueCents, String currency) {}

  public record BonusValueInput(String bonusRuleId, String valueKind, Integer valueCents, Integer valueBps) {}

  public record SaveValuesRequest(
      String sectorId,
      String periodStart,
      String periodEnd,
      List<ShiftTypeValueInput> shiftTypes,
      List<BonusValueInput> bonuses
  ) {}

  public ValuesSettingsController(
      ShiftTypeValueJpaRepository shiftTypeValueRepository,
      BonusValueJpaRepository bonusValueRepository,
      BonusRuleJpaRepository bonusRuleRepository
  ) {
    this.shiftTypeValueRepository = shiftTypeValueRepository;
    this.bonusValueRepository = bonusValueRepository;
    this.bonusRuleRepository = bonusRuleRepository;
  }

  @GetMapping
  public ValuesResponse get(
      @RequestParam("sectorId") String sectorId,
      @RequestParam("periodStart") String periodStart,
      @RequestParam("periodEnd") String periodEnd
  ) {
    UUID tenantId = requireTenantId();
    UUID sectorUuid = parseUuid(sectorId, "sector_invalid");
    LocalDate start = parseDate(periodStart, "period_start_invalid");
    LocalDate end = parseDate(periodEnd, "period_end_invalid");
    if (end.isBefore(start)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "period_invalid");

    List<ShiftTypeValueResponse> shiftTypes = shiftTypeValueRepository
        .findByTenantIdAndSectorIdAndPeriodStartAndPeriodEnd(tenantId, sectorUuid, start, end)
        .stream()
        .map(v -> new ShiftTypeValueResponse(v.getShiftTypeCode(), v.getValueCents(), v.getCurrency()))
        .toList();

    List<BonusValueResponse> bonuses = bonusValueRepository
        .findByTenantIdAndSectorIdAndPeriodStartAndPeriodEnd(tenantId, sectorUuid, start, end)
        .stream()
        .map(v -> new BonusValueResponse(v.getBonusRuleId().toString(), v.getValueKind(), v.getValueCents(), v.getValueBps()))
        .toList();

    return new ValuesResponse(sectorUuid.toString(), start.toString(), end.toString(), shiftTypes, bonuses);
  }

  @PutMapping
  public ValuesResponse save(Authentication authentication, @RequestBody SaveValuesRequest request) {
    Authz.requireRole(authentication, "ADMIN");
    UUID tenantId = requireTenantId();

    if (request == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "body_required");
    UUID sectorUuid = parseUuid(request.sectorId(), "sector_invalid");
    LocalDate start = parseDate(request.periodStart(), "period_start_invalid");
    LocalDate end = parseDate(request.periodEnd(), "period_end_invalid");
    if (end.isBefore(start)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "period_invalid");

    List<ShiftTypeValueInput> shiftTypesInput = request.shiftTypes() == null ? List.of() : request.shiftTypes();
    List<BonusValueInput> bonusesInput = request.bonuses() == null ? List.of() : request.bonuses();

    shiftTypeValueRepository.deleteByTenantIdAndSectorIdAndPeriodStartAndPeriodEnd(tenantId, sectorUuid, start, end);
    bonusValueRepository.deleteByTenantIdAndSectorIdAndPeriodStartAndPeriodEnd(tenantId, sectorUuid, start, end);

    if (!shiftTypesInput.isEmpty()) {
      Set<String> seenShiftTypeCodes = new HashSet<>();
      List<ShiftTypeValueJpaEntity> toSave = new ArrayList<>(shiftTypesInput.size());
      for (ShiftTypeValueInput v : shiftTypesInput) {
        if (v == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "shift_type_invalid");
        String code = v.shiftTypeCode() == null ? "" : v.shiftTypeCode().trim();
        if (code.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "shift_type_code_required");
        if (!seenShiftTypeCodes.add(code)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "shift_type_duplicate");
        if (v.valueCents() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "shift_type_value_required");
        if (v.valueCents() < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "shift_type_value_invalid");
        String currency = v.currency() == null || v.currency().isBlank() ? "BRL" : v.currency().trim().toUpperCase();
        toSave.add(new ShiftTypeValueJpaEntity(tenantId, sectorUuid, start, end, code, v.valueCents(), currency));
      }
      shiftTypeValueRepository.saveAll(toSave);
    }

    if (!bonusesInput.isEmpty()) {
      Set<UUID> seenBonusRuleIds = new HashSet<>();
      List<BonusValueJpaEntity> toSave = new ArrayList<>(bonusesInput.size());
      for (BonusValueInput v : bonusesInput) {
        if (v == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "bonus_invalid");
        UUID ruleId = parseUuid(v.bonusRuleId(), "bonus_rule_invalid");
        if (!seenBonusRuleIds.add(ruleId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "bonus_duplicate");

        BonusRuleJpaEntity rule = bonusRuleRepository.findByTenantIdAndId(tenantId, ruleId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "bonus_rule_not_found"));

        String expectedKind = rule.getValueKind() == null ? "" : rule.getValueKind().trim().toUpperCase();
        String inputKind = v.valueKind() == null ? "" : v.valueKind().trim().toUpperCase();
        if (expectedKind.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "bonus_rule_invalid");
        if (!expectedKind.equals(inputKind)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "bonus_value_kind_invalid");

        Integer valueCents = null;
        Integer valueBps = null;
        if ("CURRENCY".equals(expectedKind)) {
          if (v.valueCents() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "bonus_value_required");
          if (v.valueCents() < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "bonus_value_invalid");
          valueCents = v.valueCents();
        } else if ("PERCENT".equals(expectedKind)) {
          if (v.valueBps() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "bonus_value_required");
          if (v.valueBps() < 0 || v.valueBps() > 10000) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "bonus_value_invalid");
          valueBps = v.valueBps();
        } else {
          throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "bonus_value_kind_invalid");
        }

        toSave.add(new BonusValueJpaEntity(tenantId, sectorUuid, start, end, ruleId, expectedKind, valueCents, valueBps));
      }
      bonusValueRepository.saveAll(toSave);
    }

    return get(sectorUuid.toString(), start.toString(), end.toString());
  }

  private UUID requireTenantId() {
    String raw = TenantContext.getTenantId();
    if (raw == null || raw.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenant_required");
    return parseUuid(raw, "tenant_invalid");
  }

  private UUID parseUuid(String raw, String code) {
    try {
      if (raw == null) throw new IllegalArgumentException();
      return UUID.fromString(raw.trim());
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, code);
    }
  }

  private LocalDate parseDate(String raw, String code) {
    try {
      if (raw == null) throw new IllegalArgumentException();
      return LocalDate.parse(raw.trim());
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, code);
    }
  }
}

