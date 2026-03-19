package com.getescala.scheduling.application;

import com.getescala.scheduling.infrastructure.persistence.ScheduleJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.ScheduleJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.AttendanceRecordJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.AttendanceRecordJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.LocationJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.LocationJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.SectorJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.SectorJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.ShiftJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.ShiftJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.ShiftSituationJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.ShiftSituationJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.ShiftTypeJpaRepository;
import com.getescala.tenant.TenantContext;
import com.getescala.workforce.application.ProfessionalService;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ShiftService {
  public record ShiftDto(
      String id,
      String scheduleId,
      String professionalId,
      String fixedProfessionalId,
      OffsetDateTime startTime,
      OffsetDateTime endTime,
      String kind,
      String situationCode,
      OffsetDateTime checkInAt,
      OffsetDateTime checkOutAt,
      String status,
      Integer valueCents,
      String currency
  ) {}

  public record CreateShiftRequest(
      String scheduleId,
      String professionalId,
      String fixedProfessionalId,
      OffsetDateTime startTime,
      OffsetDateTime endTime,
      String kind,
      String situationCode,
      Integer valueCents,
      String currency
  ) {}

  public record UpdateShiftRequest(
      String professionalId,
      String fixedProfessionalId,
      OffsetDateTime startTime,
      OffsetDateTime endTime,
      String kind,
      String situationCode,
      Integer valueCents,
      String currency
  ) {}

  private final ScheduleJpaRepository scheduleRepository;
  private final ShiftJpaRepository shiftRepository;
  private final ShiftTypeJpaRepository shiftTypeRepository;
  private final ShiftSituationJpaRepository shiftSituationRepository;
  private final ProfessionalService professionalService;
  private final AttendanceRecordJpaRepository attendanceRecordRepository;
  private final SectorJpaRepository sectorRepository;
  private final LocationJpaRepository locationRepository;

  public ShiftService(
      ScheduleJpaRepository scheduleRepository,
      ShiftJpaRepository shiftRepository,
      ShiftTypeJpaRepository shiftTypeRepository,
      ShiftSituationJpaRepository shiftSituationRepository,
      ProfessionalService professionalService,
      AttendanceRecordJpaRepository attendanceRecordRepository,
      SectorJpaRepository sectorRepository,
      LocationJpaRepository locationRepository
  ) {
    this.scheduleRepository = scheduleRepository;
    this.shiftRepository = shiftRepository;
    this.shiftTypeRepository = shiftTypeRepository;
    this.shiftSituationRepository = shiftSituationRepository;
    this.professionalService = professionalService;
    this.attendanceRecordRepository = attendanceRecordRepository;
    this.sectorRepository = sectorRepository;
    this.locationRepository = locationRepository;
  }

  @Transactional(readOnly = true)
  public List<ShiftDto> list(OffsetDateTime from, OffsetDateTime to, String scheduleId, String professionalId, String kind) {
    UUID tenantId = currentTenantId();
    OffsetDateTime fromValue = from == null ? OffsetDateTime.now(ZoneOffset.UTC).minusDays(7) : from;
    OffsetDateTime toValue = to == null ? OffsetDateTime.now(ZoneOffset.UTC).plusDays(30) : to;

    UUID scheduleUuid = scheduleId == null || scheduleId.isBlank() ? null : parseUuid(scheduleId, "scheduleId");
    UUID professionalUuid =
        professionalId == null || professionalId.isBlank() ? null : parseUuid(professionalId, "professionalId");
    String normalizedKind = normalizeKind(kind);
    if (normalizedKind != null && !shiftTypeRepository.existsByTenantIdAndCode(tenantId, normalizedKind)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_kind");
    }

    return shiftRepository.findByFiltersOrderByStartTimeAsc(
            tenantId,
            fromValue,
            toValue,
            scheduleUuid,
            professionalUuid,
            normalizedKind
        ).stream()
        .map(ShiftService::toDto)
        .toList();
  }

  @Transactional
  public ShiftDto create(CreateShiftRequest request) {
    UUID tenantId = currentTenantId();

    UUID scheduleId = parseUuid(request.scheduleId(), "scheduleId");
    ScheduleJpaEntity schedule = scheduleRepository.findById(scheduleId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "schedule_not_found"));
    if (!schedule.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "schedule_forbidden");
    }
    if (!"DRAFT".equals(schedule.getStatus())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "schedule_not_editable");
    }

    OffsetDateTime startTime = required(request.startTime(), "startTime");
    OffsetDateTime endTime = required(request.endTime(), "endTime");
    if (!startTime.isBefore(endTime)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_time_range");
    }

    UUID professionalId = request.professionalId() == null || request.professionalId().isBlank()
        ? null
        : parseUuid(request.professionalId(), "professionalId");

    UUID fixedProfessionalId = request.fixedProfessionalId() == null || request.fixedProfessionalId().isBlank()
        ? null
        : parseUuid(request.fixedProfessionalId(), "fixedProfessionalId");

    if (professionalId != null && !professionalService.existsInTenant(tenantId, professionalId)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "professional_not_found");
    }
    if (fixedProfessionalId != null && !professionalService.existsInTenant(tenantId, fixedProfessionalId)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fixed_professional_not_found");
    }

    if (professionalId != null && shiftRepository.existsOverlap(tenantId, professionalId, startTime, endTime, null)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "shift_overlap");
    }

    String kind = normalizeKind(request.kind());
    if (kind == null) kind = "NORMAL";
    if (!shiftTypeRepository.existsByTenantIdAndCode(tenantId, kind)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_kind");
    }

    ShiftSituationJpaEntity situation = resolveShiftSituation(tenantId, request.situationCode());
    if (situation.isRequiresCoverage()) {
      if (fixedProfessionalId == null || professionalId == null) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "coverage_requires_two_professionals");
      }
      if (fixedProfessionalId.equals(professionalId)) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "coverage_requires_different_professionals");
      }
    } else {
      if (fixedProfessionalId == null) fixedProfessionalId = professionalId;
    }

    ShiftJpaEntity entity = new ShiftJpaEntity(
        tenantId,
        scheduleId,
        professionalId,
        startTime,
        endTime,
        kind,
        request.valueCents(),
        request.currency()
    );
    entity.updateDetails(
        entity.getProfessionalId(),
        fixedProfessionalId,
        entity.getStartTime(),
        entity.getEndTime(),
        entity.getKind(),
        situation.getCode(),
        entity.getValueCents(),
        entity.getCurrency()
    );

    ShiftJpaEntity saved = shiftRepository.save(entity);
    return toDto(saved);
  }

  @Transactional
  public ShiftDto update(String shiftId, UpdateShiftRequest request) {
    UUID tenantId = currentTenantId();
    UUID shiftUuid = parseUuid(shiftId, "id");

    ShiftJpaEntity shift = shiftRepository.findById(shiftUuid)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "shift_not_found"));
    if (!shift.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "shift_forbidden");
    }
    ScheduleJpaEntity schedule = scheduleRepository.findById(shift.getScheduleId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "schedule_not_found"));
    if (!schedule.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "schedule_forbidden");
    }
    if (!"DRAFT".equals(schedule.getStatus())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "schedule_not_editable");
    }

    OffsetDateTime startTime = request.startTime() == null ? shift.getStartTime() : request.startTime();
    OffsetDateTime endTime = request.endTime() == null ? shift.getEndTime() : request.endTime();
    if (!startTime.isBefore(endTime)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_time_range");
    }

    UUID professionalId = request.professionalId() == null
        ? shift.getProfessionalId()
        : (request.professionalId().isBlank() ? null : parseUuid(request.professionalId(), "professionalId"));

    UUID fixedProfessionalId = request.fixedProfessionalId() == null
        ? shift.getFixedProfessionalId()
        : (request.fixedProfessionalId().isBlank() ? null : parseUuid(request.fixedProfessionalId(), "fixedProfessionalId"));

    if (professionalId != null && !professionalService.existsInTenant(tenantId, professionalId)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "professional_not_found");
    }
    if (fixedProfessionalId != null && !professionalService.existsInTenant(tenantId, fixedProfessionalId)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fixed_professional_not_found");
    }

    if (professionalId != null && shiftRepository.existsOverlap(tenantId, professionalId, startTime, endTime, shiftUuid)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "shift_overlap");
    }

    String kind = request.kind() == null ? shift.getKind() : normalizeKind(request.kind());
    if (kind == null) kind = "NORMAL";
    if (!shiftTypeRepository.existsByTenantIdAndCode(tenantId, kind)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_kind");
    }

    ShiftSituationJpaEntity situation = resolveShiftSituation(tenantId, request.situationCode() == null ? shift.getSituationCode() : request.situationCode());
    String situationCode = situation.getCode();
    if (situation.isRequiresCoverage()) {
      if (fixedProfessionalId == null || professionalId == null) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "coverage_requires_two_professionals");
      }
      if (fixedProfessionalId.equals(professionalId)) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "coverage_requires_different_professionals");
      }
    } else {
      if (fixedProfessionalId == null) fixedProfessionalId = professionalId;
    }

    shift.updateDetails(
        professionalId,
        fixedProfessionalId,
        startTime,
        endTime,
        kind,
        situationCode,
        request.valueCents() == null ? shift.getValueCents() : request.valueCents(),
        request.currency() == null ? shift.getCurrency() : request.currency()
    );

    ShiftJpaEntity saved = shiftRepository.save(shift);
    return toDto(saved);
  }

  @Transactional
  public void cancel(String shiftId) {
    UUID tenantId = currentTenantId();
    UUID shiftUuid = parseUuid(shiftId, "id");

    ShiftJpaEntity shift = shiftRepository.findById(shiftUuid)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "shift_not_found"));
    if (!shift.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "shift_forbidden");
    }
    ScheduleJpaEntity schedule = scheduleRepository.findById(shift.getScheduleId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "schedule_not_found"));
    if (!schedule.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "schedule_forbidden");
    }
    if (!"DRAFT".equals(schedule.getStatus())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "schedule_not_editable");
    }

    shift.cancel();
    shiftRepository.save(shift);
  }

  @Transactional
  public ShiftDto checkIn(String shiftId) {
    UUID tenantId = currentTenantId();
    UUID shiftUuid = parseUuid(shiftId, "id");

    ShiftJpaEntity shift = shiftRepository.findById(shiftUuid)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "shift_not_found"));
    if (!shift.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "shift_forbidden");
    }
    ScheduleJpaEntity schedule = scheduleRepository.findById(shift.getScheduleId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "schedule_not_found"));
    if (!schedule.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "schedule_forbidden");
    }
    if ("DRAFT".equals(schedule.getStatus())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "schedule_not_published");
    }
    if ("CANCELLED".equals(shift.getStatus())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "shift_cancelled");
    }
    if (shift.getProfessionalId() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "professional_required");
    }
    if (shift.getCheckInAt() != null) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "already_checked_in");
    }

    OffsetDateTime now = OffsetDateTime.now(resolveZoneId(tenantId, schedule));
    shift.checkIn(now);
    ShiftJpaEntity saved = shiftRepository.save(shift);
    attendanceRecordRepository.save(new AttendanceRecordJpaEntity(tenantId, shiftUuid, shift.getProfessionalId(), now));
    return toDto(saved);
  }

  @Transactional
  public ShiftDto checkOut(String shiftId) {
    UUID tenantId = currentTenantId();
    UUID shiftUuid = parseUuid(shiftId, "id");

    ShiftJpaEntity shift = shiftRepository.findById(shiftUuid)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "shift_not_found"));
    if (!shift.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "shift_forbidden");
    }
    ScheduleJpaEntity schedule = scheduleRepository.findById(shift.getScheduleId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "schedule_not_found"));
    if (!schedule.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "schedule_forbidden");
    }
    if ("DRAFT".equals(schedule.getStatus())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "schedule_not_published");
    }
    if ("CANCELLED".equals(shift.getStatus())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "shift_cancelled");
    }
    if (shift.getProfessionalId() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "professional_required");
    }
    if (shift.getCheckInAt() == null) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "not_checked_in");
    }
    if (shift.getCheckOutAt() != null) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "already_checked_out");
    }

    OffsetDateTime now = OffsetDateTime.now(resolveZoneId(tenantId, schedule));
    shift.checkOut(now);
    ShiftJpaEntity saved = shiftRepository.save(shift);

    Optional<AttendanceRecordJpaEntity> latestRecord =
        attendanceRecordRepository.findTopByTenantIdAndShiftIdOrderByCreatedAtDesc(tenantId, shiftUuid);
    if (latestRecord.isPresent() && latestRecord.get().getCheckOutAt() == null) {
      latestRecord.get().setCheckOutAt(now);
      attendanceRecordRepository.save(latestRecord.get());
    } else {
      AttendanceRecordJpaEntity record =
          new AttendanceRecordJpaEntity(tenantId, shiftUuid, shift.getProfessionalId(), shift.getCheckInAt());
      record.setCheckOutAt(now);
      attendanceRecordRepository.save(record);
    }

    return toDto(saved);
  }

  private ZoneId resolveZoneId(UUID tenantId, ScheduleJpaEntity schedule) {
    UUID locationId = schedule.getLocationId();
    if (locationId == null) {
      UUID sectorId = schedule.getSectorId();
      if (sectorId != null) {
        SectorJpaEntity sector = sectorRepository.findByTenantIdAndId(tenantId, sectorId).orElse(null);
        locationId = sector == null ? null : sector.getLocationId();
      }
    }

    if (locationId == null) return ZoneOffset.UTC;

    LocationJpaEntity location = locationRepository.findByTenantIdAndId(tenantId, locationId).orElse(null);
    String timeZone = location == null ? null : location.getTimeZone();
    if (timeZone == null || timeZone.isBlank()) return ZoneOffset.UTC;

    try {
      return ZoneId.of(timeZone);
    } catch (Exception ignored) {
      return ZoneOffset.UTC;
    }
  }

  private static ShiftDto toDto(ShiftJpaEntity entity) {
    return new ShiftDto(
        entity.getId().toString(),
        entity.getScheduleId().toString(),
        entity.getProfessionalId() == null ? null : entity.getProfessionalId().toString(),
        entity.getFixedProfessionalId() == null ? null : entity.getFixedProfessionalId().toString(),
        entity.getStartTime(),
        entity.getEndTime(),
        entity.getKind(),
        entity.getSituationCode(),
        entity.getCheckInAt(),
        entity.getCheckOutAt(),
        entity.getStatus(),
        entity.getValueCents(),
        entity.getCurrency()
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

  private static <T> T required(T value, String fieldName) {
    if (value == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " is required");
    }
    return value;
  }

  private static String normalizeKind(String kind) {
    if (kind == null) return null;
    String trimmed = kind.trim();
    if (trimmed.isBlank()) return null;
    return trimmed.toUpperCase().replace(' ', '_');
  }

  private ShiftSituationJpaEntity resolveShiftSituation(UUID tenantId, String situationCodeRaw) {
    String code = normalizeSituationCode(situationCodeRaw);
    if (code == null) code = "DESIGNADO";
    ensureDefaultSituations(tenantId);
    return shiftSituationRepository.findByTenantIdAndCode(tenantId, code)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_situation"));
  }

  private void ensureDefaultSituations(UUID tenantId) {
    ensureDefaultSituation(tenantId, "DESIGNADO", "Designado", false, true);
    ensureDefaultSituation(tenantId, "FALTA_JUSTIFICADA", "Falta Justificada", true, false);
    ensureDefaultSituation(tenantId, "FALTA_NAO_JUSTIFICADA", "Falta Não Justificada", true, false);
    ensureDefaultSituation(tenantId, "FERIADO", "Feriado", false, false);
    ensureDefaultSituation(tenantId, "FERIAS", "Férias", false, false);
    ensureDefaultSituation(tenantId, "FOLGA", "Folga", false, false);
    ensureDefaultSituation(tenantId, "TROCADO", "Trocado", true, false);
  }

  private void ensureDefaultSituation(UUID tenantId, String code, String name, boolean requiresCoverage, boolean system) {
    if (shiftSituationRepository.existsByTenantIdAndCode(tenantId, code)) return;
    shiftSituationRepository.save(new ShiftSituationJpaEntity(tenantId, code, name, requiresCoverage, system));
  }

  private static String normalizeSituationCode(String raw) {
    if (raw == null) return null;
    String trimmed = raw.trim();
    if (trimmed.isBlank()) return null;
    return trimmed.toUpperCase().replace(' ', '_');
  }
}
