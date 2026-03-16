package com.getescala.scheduling.application;

import com.getescala.scheduling.infrastructure.persistence.ScheduleJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.ScheduleJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.ShiftAnnouncementJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.ShiftAnnouncementJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.ShiftJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.ShiftJpaRepository;
import com.getescala.tenant.TenantContext;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import java.time.YearMonth;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ScheduleService {
  public record ScheduleDto(String id, LocalDate monthReference, String status, String locationId, String sectorId) {}

  public record CreateScheduleRequest(LocalDate monthReference, String locationId, String sectorId) {}

  public record ReplicateResult(int created, int skipped) {}

  public record RequestConfirmationResult(int created, int skipped) {}

  private final ScheduleJpaRepository scheduleRepository;
  private final ShiftJpaRepository shiftRepository;
  private final ShiftAnnouncementJpaRepository shiftAnnouncementRepository;

  public ScheduleService(
      ScheduleJpaRepository scheduleRepository,
      ShiftJpaRepository shiftRepository,
      ShiftAnnouncementJpaRepository shiftAnnouncementRepository
  ) {
    this.scheduleRepository = scheduleRepository;
    this.shiftRepository = shiftRepository;
    this.shiftAnnouncementRepository = shiftAnnouncementRepository;
  }

  @Transactional(readOnly = true)
  public List<ScheduleDto> list(LocalDate from, LocalDate to, String locationId, String sectorId) {
    UUID tenantId = currentTenantId();
    UUID locationUuid = locationId == null || locationId.isBlank() ? null : parseUuid(locationId, "locationId");
    UUID sectorUuid = sectorId == null || sectorId.isBlank() ? null : parseUuid(sectorId, "sectorId");

    return scheduleRepository.findAllFiltered(tenantId, from, to, locationUuid, sectorUuid).stream()
        .map(ScheduleService::toDto)
        .toList();
  }

  @Transactional
  public ScheduleDto create(CreateScheduleRequest request) {
    UUID tenantId = currentTenantId();
    LocalDate monthReference = required(request.monthReference(), "monthReference").withDayOfMonth(1);

    UUID locationId = request.locationId() == null || request.locationId().isBlank() ? null : parseUuid(request.locationId(), "locationId");
    UUID sectorId = request.sectorId() == null || request.sectorId().isBlank() ? null : parseUuid(request.sectorId(), "sectorId");

    ScheduleJpaEntity schedule = scheduleRepository.findOneByTenantIdAndMonthReferenceAndLocationAndSector(
            tenantId,
            monthReference,
            locationId,
            sectorId
        )
        .orElseGet(() -> scheduleRepository.save(new ScheduleJpaEntity(tenantId, locationId, sectorId, monthReference)));

    return toDto(schedule);
  }

  @Transactional
  public ScheduleDto publish(String scheduleId) {
    UUID tenantId = currentTenantId();
    UUID scheduleUuid = parseUuid(scheduleId, "id");
    ScheduleJpaEntity schedule = scheduleRepository.findById(scheduleUuid)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "schedule_not_found"));
    if (!schedule.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "schedule_forbidden");
    }

    if (!"DRAFT".equals(schedule.getStatus())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "invalid_schedule_status");
    }

    schedule.publish();
    ScheduleJpaEntity saved = scheduleRepository.save(schedule);
    return toDto(saved);
  }

  @Transactional
  public ScheduleDto lock(String scheduleId) {
    UUID tenantId = currentTenantId();
    UUID scheduleUuid = parseUuid(scheduleId, "id");
    ScheduleJpaEntity schedule = scheduleRepository.findById(scheduleUuid)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "schedule_not_found"));
    if (!schedule.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "schedule_forbidden");
    }

    if (!"PUBLISHED".equals(schedule.getStatus())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "invalid_schedule_status");
    }

    schedule.lock();
    ScheduleJpaEntity saved = scheduleRepository.save(schedule);
    return toDto(saved);
  }

  @Transactional
  public ReplicateResult replicatePreviousMonth(String scheduleId) {
    UUID tenantId = currentTenantId();
    UUID scheduleUuid = parseUuid(scheduleId, "id");
    ScheduleJpaEntity target = scheduleRepository.findById(scheduleUuid)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "schedule_not_found"));
    if (!target.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "schedule_forbidden");
    }
    if (!"DRAFT".equals(target.getStatus())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "schedule_not_editable");
    }

    LocalDate targetMonth = target.getMonthReference().withDayOfMonth(1);
    LocalDate sourceMonth = targetMonth.minusMonths(1);
    ScheduleJpaEntity source = scheduleRepository.findOneByTenantIdAndMonthReferenceAndLocationAndSector(
            tenantId,
            sourceMonth,
            target.getLocationId(),
            target.getSectorId()
        )
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "source_schedule_not_found"));

    OffsetDateTime sourceFrom = sourceMonth.atStartOfDay().atOffset(ZoneOffset.UTC);
    OffsetDateTime sourceTo = sourceMonth.plusMonths(1).atStartOfDay().atOffset(ZoneOffset.UTC);
    OffsetDateTime targetFrom = targetMonth.atStartOfDay().atOffset(ZoneOffset.UTC);
    OffsetDateTime targetTo = targetMonth.plusMonths(1).atStartOfDay().atOffset(ZoneOffset.UTC);

    List<ShiftJpaEntity> existingTarget = shiftRepository.findByTenantIdAndScheduleIdAndStartTimeBetweenOrderByStartTimeAsc(
        tenantId,
        scheduleUuid,
        targetFrom,
        targetTo
    );
    var existingKeys = existingTarget.stream().map((s) -> keyForShift(s)).collect(java.util.stream.Collectors.toSet());

    List<ShiftJpaEntity> sourceShifts = shiftRepository.findByTenantIdAndScheduleIdAndStartTimeBetweenOrderByStartTimeAsc(
        tenantId,
        source.getId(),
        sourceFrom,
        sourceTo
    );

    int created = 0;
    int skipped = 0;
    YearMonth targetYearMonth = YearMonth.of(targetMonth.getYear(), targetMonth.getMonth());

    for (ShiftJpaEntity sourceShift : sourceShifts) {
      if ("CANCELLED".equals(sourceShift.getStatus())) {
        skipped += 1;
        continue;
      }

      OffsetDateTime sourceStart = sourceShift.getStartTime();
      Duration duration = Duration.between(sourceStart, sourceShift.getEndTime());
      int desiredDay = sourceStart.getDayOfMonth();
      int clampedDay = Math.min(desiredDay, targetYearMonth.lengthOfMonth());
      LocalTime time = sourceStart.toLocalTime();
      OffsetDateTime targetStart = OffsetDateTime.of(targetYearMonth.atDay(clampedDay), time, sourceStart.getOffset());
      OffsetDateTime targetEnd = targetStart.plus(duration);

      ShiftJpaEntity candidate = new ShiftJpaEntity(
          tenantId,
          scheduleUuid,
          sourceShift.getProfessionalId(),
          targetStart,
          targetEnd,
          sourceShift.getValueCents(),
          sourceShift.getCurrency()
      );

      String key = keyForShift(candidate);
      if (existingKeys.contains(key)) {
        skipped += 1;
        continue;
      }
      if (candidate.getProfessionalId() != null
          && shiftRepository.existsOverlap(tenantId, candidate.getProfessionalId(), targetStart, targetEnd, null)) {
        skipped += 1;
        continue;
      }

      shiftRepository.save(candidate);
      existingKeys.add(key);
      created += 1;
    }

    return new ReplicateResult(created, skipped);
  }

  @Transactional
  public RequestConfirmationResult requestConfirmation(String scheduleId, UUID createdBy) {
    UUID tenantId = currentTenantId();
    UUID scheduleUuid = parseUuid(scheduleId, "id");
    ScheduleJpaEntity schedule = scheduleRepository.findById(scheduleUuid)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "schedule_not_found"));
    if (!schedule.getTenantId().equals(tenantId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "schedule_forbidden");
    }
    if (!"PUBLISHED".equals(schedule.getStatus())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "schedule_not_published");
    }

    List<ShiftJpaEntity> shifts = shiftRepository.findByTenantIdAndScheduleIdOrderByStartTimeAsc(tenantId, scheduleUuid);

    int created = 0;
    int skipped = 0;
    for (ShiftJpaEntity shift : shifts) {
      if ("CANCELLED".equals(shift.getStatus())) {
        skipped += 1;
        continue;
      }
      if (shiftAnnouncementRepository.existsByTenantIdAndShiftIdAndStatus(tenantId, shift.getId(), "OPEN")) {
        skipped += 1;
        continue;
      }
      shiftAnnouncementRepository.save(new ShiftAnnouncementJpaEntity(tenantId, shift.getId(), createdBy));
      created += 1;
    }

    return new RequestConfirmationResult(created, skipped);
  }

  private static ScheduleDto toDto(ScheduleJpaEntity entity) {
    return new ScheduleDto(
        entity.getId().toString(),
        entity.getMonthReference(),
        entity.getStatus(),
        entity.getLocationId() == null ? null : entity.getLocationId().toString(),
        entity.getSectorId() == null ? null : entity.getSectorId().toString()
    );
  }

  private static String keyForShift(ShiftJpaEntity entity) {
    String professionalKey = entity.getProfessionalId() == null ? "-" : entity.getProfessionalId().toString();
    return professionalKey + "|" + entity.getStartTime().toInstant().toString() + "|" + entity.getEndTime().toInstant().toString();
  }

  private static UUID currentTenantId() {
    String tenantId = TenantContext.getTenantId();
    if (tenantId == null || tenantId.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenant_required");
    }
    try {
      return UUID.fromString(tenantId);
    } catch (Exception ex) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenantId is invalid");
    }
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
}
