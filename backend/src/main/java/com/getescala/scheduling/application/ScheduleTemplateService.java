package com.getescala.scheduling.application;

import com.getescala.scheduling.infrastructure.persistence.ScheduleJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.ScheduleJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.ScheduleTemplateJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.ScheduleTemplateJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.ScheduleTemplateShiftJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.ScheduleTemplateShiftJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.SectorJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.SectorJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.ShiftJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.ShiftJpaRepository;
import com.getescala.tenant.TenantContext;
import com.getescala.workforce.application.ProfessionalService;
import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ScheduleTemplateService {
  public record ScheduleTemplateDto(String id, String sectorId, String name, int weeksCount) {}

  public record ScheduleTemplateShiftDto(
      String id,
      String templateId,
      int weekIndex,
      int dayOfWeek,
      LocalTime startTime,
      LocalTime endTime,
      int endDayOffset,
      String kind,
      String professionalId,
      Integer valueCents,
      String currency
  ) {}

  public record CreateScheduleTemplateRequest(String sectorId, String name, Integer weeksCount) {}

  public record UpdateScheduleTemplateRequest(String name, Integer weeksCount) {}

  public record CreateScheduleTemplateShiftRequest(
      Integer weekIndex,
      Integer dayOfWeek,
      LocalTime startTime,
      LocalTime endTime,
      Integer endDayOffset,
      String kind,
      String professionalId,
      Integer valueCents,
      String currency
  ) {}

  public record UpdateScheduleTemplateShiftRequest(
      Integer weekIndex,
      Integer dayOfWeek,
      LocalTime startTime,
      LocalTime endTime,
      Integer endDayOffset,
      String kind,
      String professionalId,
      Integer valueCents,
      String currency
  ) {}

  public record DuplicateScheduleTemplateRequest(String name) {}

  public record ApplyScheduleTemplateRequest(
      LocalDate fromMonth,
      Integer monthsCount,
      LocalDate startDate,
      LocalDate endDate,
      String mode,
      Integer startWeekIndex
  ) {}

  public record ApplyResult(int created, int skipped) {}

  private final ScheduleTemplateJpaRepository templateRepository;
  private final ScheduleTemplateShiftJpaRepository templateShiftRepository;
  private final SectorJpaRepository sectorRepository;
  private final ProfessionalService professionalService;
  private final ScheduleJpaRepository scheduleRepository;
  private final ShiftJpaRepository shiftRepository;

  public ScheduleTemplateService(
      ScheduleTemplateJpaRepository templateRepository,
      ScheduleTemplateShiftJpaRepository templateShiftRepository,
      SectorJpaRepository sectorRepository,
      ProfessionalService professionalService,
      ScheduleJpaRepository scheduleRepository,
      ShiftJpaRepository shiftRepository
  ) {
    this.templateRepository = templateRepository;
    this.templateShiftRepository = templateShiftRepository;
    this.sectorRepository = sectorRepository;
    this.professionalService = professionalService;
    this.scheduleRepository = scheduleRepository;
    this.shiftRepository = shiftRepository;
  }

  @Transactional(readOnly = true)
  public List<ScheduleTemplateDto> listBySector(String sectorId) {
    UUID tenantId = currentTenantId();
    UUID sectorUuid = parseUuid(requiredString(sectorId, "sectorId"), "sectorId");
    return templateRepository.findByTenantIdAndSectorIdOrderByNameAsc(tenantId, sectorUuid).stream()
        .map(ScheduleTemplateService::toDto)
        .toList();
  }

  @Transactional
  public ScheduleTemplateDto create(CreateScheduleTemplateRequest request) {
    UUID tenantId = currentTenantId();
    UUID sectorId = parseUuid(requiredString(request.sectorId(), "sectorId"), "sectorId");
    SectorJpaEntity sector = sectorRepository.findById(sectorId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "sector_not_found"));
    if (!sector.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "sector_forbidden");
    }

    String name = requiredString(request.name(), "name").trim();
    int weeksCount = clampWeeksCount(request.weeksCount());
    ScheduleTemplateJpaEntity entity = new ScheduleTemplateJpaEntity(tenantId, sectorId, name, weeksCount);
    ScheduleTemplateJpaEntity saved = templateRepository.save(entity);
    return toDto(saved);
  }

  @Transactional
  public ScheduleTemplateDto update(String templateId, UpdateScheduleTemplateRequest request) {
    UUID tenantId = currentTenantId();
    UUID templateUuid = parseUuid(templateId, "id");
    ScheduleTemplateJpaEntity template = templateRepository.findById(templateUuid)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "template_not_found"));
    if (!template.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "template_forbidden");
    }

    String name = request.name() == null ? template.getName() : requiredString(request.name(), "name").trim();
    int weeksCount = request.weeksCount() == null ? template.getWeeksCount() : clampWeeksCount(request.weeksCount());
    template.update(name, weeksCount);
    ScheduleTemplateJpaEntity saved = templateRepository.save(template);
    templateShiftRepository.deleteByTenantIdAndTemplateIdAndWeekIndexGreaterThan(tenantId, templateUuid, weeksCount);
    return toDto(saved);
  }

  @Transactional
  public void delete(String templateId) {
    UUID tenantId = currentTenantId();
    UUID templateUuid = parseUuid(templateId, "id");
    ScheduleTemplateJpaEntity template = templateRepository.findById(templateUuid)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "template_not_found"));
    if (!template.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "template_forbidden");
    }
    templateRepository.delete(template);
  }

  @Transactional
  public ScheduleTemplateDto duplicate(String templateId, DuplicateScheduleTemplateRequest request) {
    UUID tenantId = currentTenantId();
    UUID templateUuid = parseUuid(templateId, "id");
    ScheduleTemplateJpaEntity source = templateRepository.findById(templateUuid)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "template_not_found"));
    if (!source.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "template_forbidden");
    }

    String desiredName = request == null || request.name() == null || request.name().isBlank()
        ? (source.getName() + " (cópia)")
        : request.name().trim();

    String name = ensureUniqueName(tenantId, source.getSectorId(), desiredName);
    ScheduleTemplateJpaEntity target = templateRepository.save(new ScheduleTemplateJpaEntity(
        tenantId,
        source.getSectorId(),
        name,
        source.getWeeksCount()
    ));

    List<ScheduleTemplateShiftJpaEntity> sourceShifts = templateShiftRepository
        .findByTenantIdAndTemplateIdOrderByWeekIndexAscDayOfWeekAscStartTimeAsc(tenantId, templateUuid);

    for (ScheduleTemplateShiftJpaEntity s : sourceShifts) {
      templateShiftRepository.save(new ScheduleTemplateShiftJpaEntity(
          tenantId,
          target.getId(),
          s.getWeekIndex(),
          s.getDayOfWeek(),
          s.getStartTime(),
          s.getEndTime(),
          s.getEndDayOffset(),
          s.getKind(),
          s.getProfessionalId(),
          s.getValueCents(),
          s.getCurrency()
      ));
    }

    return toDto(target);
  }

  @Transactional
  public void clear(String templateId) {
    UUID tenantId = currentTenantId();
    UUID templateUuid = parseUuid(templateId, "id");
    ScheduleTemplateJpaEntity template = templateRepository.findById(templateUuid)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "template_not_found"));
    if (!template.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "template_forbidden");
    }
    templateShiftRepository.deleteByTenantIdAndTemplateId(tenantId, templateUuid);
  }

  @Transactional(readOnly = true)
  public List<ScheduleTemplateShiftDto> listShifts(String templateId) {
    UUID tenantId = currentTenantId();
    UUID templateUuid = parseUuid(templateId, "id");
    ScheduleTemplateJpaEntity template = templateRepository.findById(templateUuid)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "template_not_found"));
    if (!template.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "template_forbidden");
    }

    return templateShiftRepository.findByTenantIdAndTemplateIdOrderByWeekIndexAscDayOfWeekAscStartTimeAsc(tenantId, templateUuid)
        .stream()
        .map(ScheduleTemplateService::toDto)
        .toList();
  }

  @Transactional
  public ScheduleTemplateShiftDto createShift(String templateId, CreateScheduleTemplateShiftRequest request) {
    UUID tenantId = currentTenantId();
    UUID templateUuid = parseUuid(templateId, "id");
    ScheduleTemplateJpaEntity template = templateRepository.findById(templateUuid)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "template_not_found"));
    if (!template.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "template_forbidden");
    }

    int weekIndex = validateWeekIndex(requiredInt(request.weekIndex(), "weekIndex"), template.getWeeksCount());
    int dayOfWeek = validateDayOfWeek(requiredInt(request.dayOfWeek(), "dayOfWeek"));
    LocalTime startTime = required(request.startTime(), "startTime");
    LocalTime endTime = required(request.endTime(), "endTime");
    int endDayOffset = validateEndDayOffset(request.endDayOffset());
    String kind = normalizeKind(request.kind());
    UUID professionalId = parseOptionalUuid(request.professionalId(), "professionalId");
    if (professionalId != null && !professionalService.existsInTenant(tenantId, professionalId)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "professional_not_found");
    }
    if (endDayOffset == 0 && !startTime.isBefore(endTime)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_time_range");
    }
    if (endDayOffset == 1 && startTime.equals(endTime)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_time_range");
    }

    ScheduleTemplateShiftJpaEntity entity = new ScheduleTemplateShiftJpaEntity(
        tenantId,
        templateUuid,
        weekIndex,
        dayOfWeek,
        startTime,
        endTime,
        endDayOffset,
        kind,
        professionalId,
        request.valueCents(),
        blankToNull(request.currency())
    );
    ScheduleTemplateShiftJpaEntity saved = templateShiftRepository.save(entity);
    return toDto(saved);
  }

  @Transactional
  public ScheduleTemplateShiftDto updateShift(String shiftId, UpdateScheduleTemplateShiftRequest request) {
    UUID tenantId = currentTenantId();
    UUID shiftUuid = parseUuid(shiftId, "id");
    ScheduleTemplateShiftJpaEntity shift = templateShiftRepository.findById(shiftUuid)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "template_shift_not_found"));
    if (!shift.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "template_shift_forbidden");
    }

    ScheduleTemplateJpaEntity template = templateRepository.findById(shift.getTemplateId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "template_not_found"));
    if (!template.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "template_forbidden");
    }

    int weekIndex = request.weekIndex() == null ? shift.getWeekIndex() : validateWeekIndex(request.weekIndex(), template.getWeeksCount());
    int dayOfWeek = request.dayOfWeek() == null ? shift.getDayOfWeek() : validateDayOfWeek(request.dayOfWeek());
    LocalTime startTime = request.startTime() == null ? shift.getStartTime() : request.startTime();
    LocalTime endTime = request.endTime() == null ? shift.getEndTime() : request.endTime();
    int endDayOffset = request.endDayOffset() == null ? shift.getEndDayOffset() : validateEndDayOffset(request.endDayOffset());
    String kind = request.kind() == null ? shift.getKind() : normalizeKind(request.kind());
    UUID professionalId = request.professionalId() == null ? shift.getProfessionalId() : parseOptionalUuid(request.professionalId(), "professionalId");

    if (professionalId != null && !professionalService.existsInTenant(tenantId, professionalId)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "professional_not_found");
    }
    if (endDayOffset == 0 && !startTime.isBefore(endTime)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_time_range");
    }
    if (endDayOffset == 1 && startTime.equals(endTime)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_time_range");
    }

    shift.updateDetails(
        weekIndex,
        dayOfWeek,
        startTime,
        endTime,
        endDayOffset,
        kind,
        professionalId,
        request.valueCents() == null ? shift.getValueCents() : request.valueCents(),
        request.currency() == null ? shift.getCurrency() : blankToNull(request.currency())
    );
    ScheduleTemplateShiftJpaEntity saved = templateShiftRepository.save(shift);
    return toDto(saved);
  }

  @Transactional
  public void deleteShift(String shiftId) {
    UUID tenantId = currentTenantId();
    UUID shiftUuid = parseUuid(shiftId, "id");
    ScheduleTemplateShiftJpaEntity shift = templateShiftRepository.findById(shiftUuid)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "template_shift_not_found"));
    if (!shift.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "template_shift_forbidden");
    }
    templateShiftRepository.delete(shift);
  }

  @Transactional(readOnly = true)
  public byte[] exportCsv(String templateId) {
    UUID tenantId = currentTenantId();
    UUID templateUuid = parseUuid(templateId, "id");
    ScheduleTemplateJpaEntity template = templateRepository.findById(templateUuid)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "template_not_found"));
    if (!template.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "template_forbidden");
    }

    List<ScheduleTemplateShiftJpaEntity> shifts = templateShiftRepository
        .findByTenantIdAndTemplateIdOrderByWeekIndexAscDayOfWeekAscStartTimeAsc(tenantId, templateUuid);

    StringBuilder csv = new StringBuilder();
    csv.append("templateId,templateName,sectorId,weekIndex,dayOfWeek,startTime,endTime,endDayOffset,kind,professionalId,valueCents,currency\n");
    for (ScheduleTemplateShiftJpaEntity s : shifts) {
      csv.append(escape(template.getId().toString())).append(',')
          .append(escape(template.getName())).append(',')
          .append(escape(template.getSectorId().toString())).append(',')
          .append(escape(Integer.toString(s.getWeekIndex()))).append(',')
          .append(escape(Integer.toString(s.getDayOfWeek()))).append(',')
          .append(escape(s.getStartTime().toString())).append(',')
          .append(escape(s.getEndTime().toString())).append(',')
          .append(escape(Integer.toString(s.getEndDayOffset()))).append(',')
          .append(escape(s.getKind())).append(',')
          .append(escape(s.getProfessionalId() == null ? "" : s.getProfessionalId().toString())).append(',')
          .append(escape(s.getValueCents() == null ? "" : s.getValueCents().toString())).append(',')
          .append(escape(s.getCurrency() == null ? "" : s.getCurrency()))
          .append('\n');
    }
    return csv.toString().getBytes(StandardCharsets.UTF_8);
  }

  @Transactional
  public ApplyResult apply(String templateId, ApplyScheduleTemplateRequest request) {
    UUID tenantId = currentTenantId();
    UUID templateUuid = parseUuid(templateId, "id");
    ScheduleTemplateJpaEntity template = templateRepository.findById(templateUuid)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "template_not_found"));
    if (!template.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "template_forbidden");
    }

    SectorJpaEntity sector = sectorRepository.findById(template.getSectorId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "sector_not_found"));
    if (!sector.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "sector_forbidden");
    }

    LocalDate fromMonth = required(request.fromMonth(), "fromMonth").withDayOfMonth(1);
    int monthsCount = request.monthsCount() == null ? 1 : request.monthsCount().intValue();
    if (monthsCount < 1 || monthsCount > 24) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_months_count");
    }

    List<ScheduleTemplateShiftJpaEntity> templateShifts = templateShiftRepository
        .findByTenantIdAndTemplateIdOrderByWeekIndexAscDayOfWeekAscStartTimeAsc(tenantId, templateUuid);

    String applyMode = normalizeApplyMode(request.mode());
    if ("KEEP_WEEKDAYS".equals(applyMode) && template.getWeeksCount() != 5) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "keep_weekdays_requires_5_weeks");
    }
    int startWeekIndex = request.startWeekIndex() == null ? 1 : request.startWeekIndex().intValue();
    startWeekIndex = validateWeekIndex(startWeekIndex, template.getWeeksCount());
    int weekOffset = startWeekIndex - 1;

    int created = 0;
    int skipped = 0;

    Map<String, List<ScheduleTemplateShiftJpaEntity>> shiftsByKey = new HashMap<>();
    for (ScheduleTemplateShiftJpaEntity ts : templateShifts) {
      String key = ts.getWeekIndex() + ":" + ts.getDayOfWeek();
      shiftsByKey.computeIfAbsent(key, (k) -> new java.util.ArrayList<>()).add(ts);
    }

    for (int m = 0; m < monthsCount; m++) {
      LocalDate monthRef = fromMonth.plusMonths(m).withDayOfMonth(1);
      LocalDate monthStart = monthRef;
      LocalDate monthEndExclusive = monthRef.plusMonths(1);

      LocalDate effectiveStart = request.startDate() == null ? monthStart : maxDate(request.startDate(), monthStart);
      LocalDate effectiveEndInclusive = request.endDate() == null ? monthEndExclusive.minusDays(1) : minDate(request.endDate(), monthEndExclusive.minusDays(1));
      if (effectiveStart.isAfter(effectiveEndInclusive)) {
        continue;
      }

      ScheduleJpaEntity schedule = scheduleRepository.findOneByTenantIdAndMonthReferenceAndLocationAndSector(
              tenantId,
              monthRef,
              sector.getLocationId(),
              sector.getId()
          )
          .orElseGet(() -> scheduleRepository.save(new ScheduleJpaEntity(tenantId, sector.getLocationId(), sector.getId(), monthRef)));

      if (!"DRAFT".equals(schedule.getStatus())) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "schedule_not_editable");
      }

      OffsetDateTime from = effectiveStart.atStartOfDay().atOffset(ZoneOffset.UTC);
      OffsetDateTime to = effectiveEndInclusive.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

      List<ShiftJpaEntity> existing = shiftRepository.findByTenantIdAndScheduleIdAndStartTimeBetweenOrderByStartTimeAsc(
          tenantId,
          schedule.getId(),
          from,
          to
      );
      Set<String> existingKeys = existing.stream().map(ScheduleTemplateService::keyForShift).collect(java.util.stream.Collectors.toSet());

      if ("KEEP_WEEKDAYS".equals(applyMode)) {
        int[] occurrenceByDow = new int[8];
        for (LocalDate date = monthStart; date.isBefore(monthEndExclusive); date = date.plusDays(1)) {
          int dayOfWeek = toDayOfWeekInt(date.getDayOfWeek());
          occurrenceByDow[dayOfWeek] += 1;
          int weekIndex = occurrenceByDow[dayOfWeek];
          if (date.isBefore(effectiveStart) || date.isAfter(effectiveEndInclusive)) continue;
          List<ScheduleTemplateShiftJpaEntity> targets = shiftsByKey.get(weekIndex + ":" + dayOfWeek);
          if (targets == null || targets.isEmpty()) continue;

          for (ScheduleTemplateShiftJpaEntity ts : targets) {
            OffsetDateTime start = OffsetDateTime.of(date, ts.getStartTime(), ZoneOffset.UTC);
            OffsetDateTime end = OffsetDateTime.of(date.plusDays(ts.getEndDayOffset()), ts.getEndTime(), ZoneOffset.UTC);
            UUID professionalId = ts.getProfessionalId();

            ShiftJpaEntity candidate = new ShiftJpaEntity(
                tenantId,
                schedule.getId(),
                professionalId,
                start,
                end,
                ts.getValueCents(),
                ts.getCurrency()
            );

            String key = keyForShift(candidate);
            if (existingKeys.contains(key)) {
              skipped += 1;
              continue;
            }
            if (professionalId != null && shiftRepository.existsOverlap(tenantId, professionalId, start, end, null)) {
              skipped += 1;
              continue;
            }

            shiftRepository.save(candidate);
            existingKeys.add(key);
            created += 1;
          }
        }
      } else {
        LocalDate anchorMonday = toMonday(effectiveStart);
        for (LocalDate date = effectiveStart; !date.isAfter(effectiveEndInclusive); date = date.plusDays(1)) {
          int dayOfWeek = toDayOfWeekInt(date.getDayOfWeek());
          int weekIndex = applyWeekOffset(weekIndexForDate(anchorMonday, date, template.getWeeksCount()), weekOffset, template.getWeeksCount());
          List<ScheduleTemplateShiftJpaEntity> targets = shiftsByKey.get(weekIndex + ":" + dayOfWeek);
          if (targets == null || targets.isEmpty()) continue;

          for (ScheduleTemplateShiftJpaEntity ts : targets) {
            OffsetDateTime start = OffsetDateTime.of(date, ts.getStartTime(), ZoneOffset.UTC);
            OffsetDateTime end = OffsetDateTime.of(date.plusDays(ts.getEndDayOffset()), ts.getEndTime(), ZoneOffset.UTC);
            UUID professionalId = ts.getProfessionalId();

            ShiftJpaEntity candidate = new ShiftJpaEntity(
                tenantId,
                schedule.getId(),
                professionalId,
                start,
                end,
                ts.getValueCents(),
                ts.getCurrency()
            );

            String key = keyForShift(candidate);
            if (existingKeys.contains(key)) {
              skipped += 1;
              continue;
            }
            if (professionalId != null && shiftRepository.existsOverlap(tenantId, professionalId, start, end, null)) {
              skipped += 1;
              continue;
            }

            shiftRepository.save(candidate);
            existingKeys.add(key);
            created += 1;
          }
        }
      }
    }

    return new ApplyResult(created, skipped);
  }

  private static ScheduleTemplateDto toDto(ScheduleTemplateJpaEntity entity) {
    return new ScheduleTemplateDto(
        entity.getId().toString(),
        entity.getSectorId().toString(),
        entity.getName(),
        entity.getWeeksCount()
    );
  }

  private static ScheduleTemplateShiftDto toDto(ScheduleTemplateShiftJpaEntity entity) {
    return new ScheduleTemplateShiftDto(
        entity.getId().toString(),
        entity.getTemplateId().toString(),
        entity.getWeekIndex(),
        entity.getDayOfWeek(),
        entity.getStartTime(),
        entity.getEndTime(),
        entity.getEndDayOffset(),
        entity.getKind(),
        entity.getProfessionalId() == null ? null : entity.getProfessionalId().toString(),
        entity.getValueCents(),
        entity.getCurrency()
    );
  }

  private static String normalizeKind(String value) {
    if (value == null || value.isBlank()) return "NORMAL";
    String kind = value.trim().toUpperCase();
    if ("NORMAL".equals(kind)) return "NORMAL";
    if ("NOTURNO".equals(kind)) return "NOTURNO";
    if ("FIM_DE_SEMANA".equals(kind)) return "FIM_DE_SEMANA";
    if ("OUTRO".equals(kind)) return "OUTRO";
    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "kind is invalid");
  }

  private static String normalizeApplyMode(String value) {
    if (value == null || value.isBlank()) return "CIRCULAR";
    String mode = value.trim().toUpperCase();
    if ("CIRCULAR".equals(mode)) return "CIRCULAR";
    if ("KEEP_WEEKDAYS".equals(mode)) return "KEEP_WEEKDAYS";
    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "mode is invalid");
  }

  private static int applyWeekOffset(int baseWeekIndex, int weekOffset, int weeksCount) {
    int idx0 = (baseWeekIndex - 1 + weekOffset) % weeksCount;
    if (idx0 < 0) idx0 += weeksCount;
    return idx0 + 1;
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

  private static UUID parseOptionalUuid(String value, String fieldName) {
    if (value == null) return null;
    String trimmed = value.trim();
    if (trimmed.isBlank()) return null;
    return parseUuid(trimmed, fieldName);
  }

  private static String requiredString(String value, String fieldName) {
    if (value == null || value.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " is required");
    }
    return value;
  }

  private static <T> T required(T value, String fieldName) {
    if (value == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " is required");
    }
    return value;
  }

  private static Integer requiredInt(Integer value, String fieldName) {
    if (value == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " is required");
    }
    return value;
  }

  private static int clampWeeksCount(Integer value) {
    int weeksCount = value == null ? 1 : value.intValue();
    if (weeksCount < 1 || weeksCount > 12) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_weeks_count");
    }
    return weeksCount;
  }

  private static int validateWeekIndex(int value, int maxWeeks) {
    if (value < 1 || value > maxWeeks) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_week_index");
    }
    return value;
  }

  private static int validateDayOfWeek(int value) {
    if (value < 1 || value > 7) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_day_of_week");
    }
    return value;
  }

  private static int validateEndDayOffset(Integer value) {
    int endDayOffset = value == null ? 0 : value.intValue();
    if (endDayOffset < 0 || endDayOffset > 1) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_end_day_offset");
    }
    return endDayOffset;
  }

  private static String blankToNull(String value) {
    if (value == null) return null;
    String trimmed = value.trim();
    return trimmed.isBlank() ? null : trimmed;
  }

  private static String escape(String value) {
    if (value == null) return "";
    boolean needsQuotes = value.contains(",") || value.contains("\"") || value.contains("\n") || value.contains("\r");
    if (!needsQuotes) return value;
    return "\"" + value.replace("\"", "\"\"") + "\"";
  }

  private String ensureUniqueName(UUID tenantId, UUID sectorId, String desiredName) {
    String base = desiredName == null ? "" : desiredName.trim();
    if (base.isBlank()) base = "Modelo";
    Set<String> names = templateRepository.findByTenantIdAndSectorIdOrderByNameAsc(tenantId, sectorId).stream()
        .map(ScheduleTemplateJpaEntity::getName)
        .collect(java.util.stream.Collectors.toSet());
    if (!names.contains(base)) return base;
    for (int i = 2; i <= 999; i++) {
      String candidate = base + " " + i;
      if (!names.contains(candidate)) return candidate;
    }
    return base + " " + UUID.randomUUID();
  }

  private static LocalDate toMonday(LocalDate date) {
    int dow = date.getDayOfWeek().getValue();
    return date.minusDays(dow - 1L);
  }

  private static int toDayOfWeekInt(DayOfWeek dow) {
    return dow.getValue();
  }

  private static int weekIndexForDate(LocalDate anchorMonday, LocalDate date, int weeksCount) {
    LocalDate dateMonday = toMonday(date);
    long weeksBetween = ChronoUnit.WEEKS.between(anchorMonday, dateMonday);
    long index0 = weeksBetween % weeksCount;
    if (index0 < 0) index0 += weeksCount;
    return (int) index0 + 1;
  }

  private static LocalDate maxDate(LocalDate a, LocalDate b) {
    return a.isAfter(b) ? a : b;
  }

  private static LocalDate minDate(LocalDate a, LocalDate b) {
    return a.isBefore(b) ? a : b;
  }

  private static String keyForShift(ShiftJpaEntity entity) {
    String professionalKey = entity.getProfessionalId() == null ? "-" : entity.getProfessionalId().toString();
    return professionalKey + "|" + entity.getStartTime().toInstant().toString() + "|" + entity.getEndTime().toInstant().toString();
  }
}
