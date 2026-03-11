package com.getescala.scheduling.application;

import com.getescala.scheduling.infrastructure.persistence.ScheduleJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.ScheduleJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.AttendanceRecordJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.AttendanceRecordJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.ShiftJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.ShiftJpaRepository;
import com.getescala.tenant.TenantContext;
import com.getescala.workforce.application.ProfessionalService;
import java.time.OffsetDateTime;
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
      OffsetDateTime startTime,
      OffsetDateTime endTime,
      OffsetDateTime checkInAt,
      OffsetDateTime checkOutAt,
      String status,
      Integer valueCents,
      String currency
  ) {}

  public record CreateShiftRequest(
      String scheduleId,
      String professionalId,
      OffsetDateTime startTime,
      OffsetDateTime endTime,
      Integer valueCents,
      String currency
  ) {}

  public record UpdateShiftRequest(
      String professionalId,
      OffsetDateTime startTime,
      OffsetDateTime endTime,
      Integer valueCents,
      String currency
  ) {}

  private final ScheduleJpaRepository scheduleRepository;
  private final ShiftJpaRepository shiftRepository;
  private final ProfessionalService professionalService;
  private final AttendanceRecordJpaRepository attendanceRecordRepository;

  public ShiftService(
      ScheduleJpaRepository scheduleRepository,
      ShiftJpaRepository shiftRepository,
      ProfessionalService professionalService,
      AttendanceRecordJpaRepository attendanceRecordRepository
  ) {
    this.scheduleRepository = scheduleRepository;
    this.shiftRepository = shiftRepository;
    this.professionalService = professionalService;
    this.attendanceRecordRepository = attendanceRecordRepository;
  }

  @Transactional(readOnly = true)
  public List<ShiftDto> list(OffsetDateTime from, OffsetDateTime to, String scheduleId, String professionalId) {
    UUID tenantId = currentTenantId();
    OffsetDateTime fromValue = from == null ? OffsetDateTime.now(ZoneOffset.UTC).minusDays(7) : from;
    OffsetDateTime toValue = to == null ? OffsetDateTime.now(ZoneOffset.UTC).plusDays(30) : to;

    UUID scheduleUuid = scheduleId == null || scheduleId.isBlank() ? null : parseUuid(scheduleId, "scheduleId");
    UUID professionalUuid =
        professionalId == null || professionalId.isBlank() ? null : parseUuid(professionalId, "professionalId");

    if (scheduleUuid != null && professionalUuid != null) {
      return shiftRepository.findByTenantIdAndScheduleIdAndProfessionalIdAndStartTimeBetweenOrderByStartTimeAsc(
              tenantId,
              scheduleUuid,
              professionalUuid,
              fromValue,
              toValue
          ).stream()
          .map(ShiftService::toDto)
          .toList();
    } else if (scheduleUuid != null) {
      return shiftRepository.findByTenantIdAndScheduleIdAndStartTimeBetweenOrderByStartTimeAsc(
              tenantId,
              scheduleUuid,
              fromValue,
              toValue
          ).stream()
          .map(ShiftService::toDto)
          .toList();
    } else if (professionalUuid != null) {
      return shiftRepository.findByTenantIdAndProfessionalIdAndStartTimeBetweenOrderByStartTimeAsc(
              tenantId,
              professionalUuid,
              fromValue,
              toValue
          ).stream()
          .map(ShiftService::toDto)
          .toList();
    }

    return shiftRepository.findByTenantIdAndStartTimeBetweenOrderByStartTimeAsc(tenantId, fromValue, toValue).stream()
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

    if (professionalId != null && !professionalService.existsInTenant(tenantId, professionalId)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "professional_not_found");
    }

    if (professionalId != null && shiftRepository.existsOverlap(tenantId, professionalId, startTime, endTime, null)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "shift_overlap");
    }

    ShiftJpaEntity entity = new ShiftJpaEntity(
        tenantId,
        scheduleId,
        professionalId,
        startTime,
        endTime,
        request.valueCents(),
        request.currency()
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

    if (professionalId != null && !professionalService.existsInTenant(tenantId, professionalId)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "professional_not_found");
    }

    if (professionalId != null && shiftRepository.existsOverlap(tenantId, professionalId, startTime, endTime, shiftUuid)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "shift_overlap");
    }

    shift.updateDetails(
        professionalId,
        startTime,
        endTime,
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

    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
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

    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
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

  private static ShiftDto toDto(ShiftJpaEntity entity) {
    return new ShiftDto(
        entity.getId().toString(),
        entity.getScheduleId().toString(),
        entity.getProfessionalId() == null ? null : entity.getProfessionalId().toString(),
        entity.getStartTime(),
        entity.getEndTime(),
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
}
