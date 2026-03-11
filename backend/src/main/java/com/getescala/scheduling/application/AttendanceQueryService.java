package com.getescala.scheduling.application;

import com.getescala.scheduling.infrastructure.persistence.ShiftJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.ShiftJpaRepository;
import com.getescala.tenant.TenantContext;
import com.getescala.workforce.infrastructure.persistence.ProfessionalJpaRepository;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AttendanceQueryService {
  public record AttendanceRowDto(
      String shiftId,
      String scheduleId,
      String professionalId,
      String professionalName,
      OffsetDateTime startTime,
      OffsetDateTime endTime,
      OffsetDateTime checkInAt,
      OffsetDateTime checkOutAt,
      String status,
      Integer scheduledMinutes,
      Integer workedMinutes,
      Integer deltaMinutes
  ) {}

  private final ShiftJpaRepository shiftRepository;
  private final ProfessionalJpaRepository professionalRepository;

  public AttendanceQueryService(ShiftJpaRepository shiftRepository, ProfessionalJpaRepository professionalRepository) {
    this.shiftRepository = shiftRepository;
    this.professionalRepository = professionalRepository;
  }

  @Transactional(readOnly = true)
  public List<AttendanceRowDto> list(OffsetDateTime from, OffsetDateTime to, String scheduleId, String professionalId) {
    UUID tenantId = currentTenantId();
    OffsetDateTime fromValue = from == null ? OffsetDateTime.now(ZoneOffset.UTC).minusDays(7) : from;
    OffsetDateTime toValue = to == null ? OffsetDateTime.now(ZoneOffset.UTC).plusDays(30) : to;

    UUID scheduleUuid = scheduleId == null || scheduleId.isBlank() ? null : parseUuid(scheduleId, "scheduleId");
    UUID professionalUuid =
        professionalId == null || professionalId.isBlank() ? null : parseUuid(professionalId, "professionalId");

    List<ShiftJpaEntity> shifts;
    if (scheduleUuid != null && professionalUuid != null) {
      shifts = shiftRepository.findByTenantIdAndScheduleIdAndProfessionalIdAndStartTimeBetweenOrderByStartTimeAsc(
          tenantId,
          scheduleUuid,
          professionalUuid,
          fromValue,
          toValue
      );
    } else if (scheduleUuid != null) {
      shifts = shiftRepository.findByTenantIdAndScheduleIdAndStartTimeBetweenOrderByStartTimeAsc(
          tenantId,
          scheduleUuid,
          fromValue,
          toValue
      );
    } else if (professionalUuid != null) {
      shifts = shiftRepository.findByTenantIdAndProfessionalIdAndStartTimeBetweenOrderByStartTimeAsc(
          tenantId,
          professionalUuid,
          fromValue,
          toValue
      );
    } else {
      shifts = shiftRepository.findByTenantIdAndStartTimeBetweenOrderByStartTimeAsc(tenantId, fromValue, toValue);
    }

    Map<String, String> professionalNameById = new HashMap<>();
    professionalRepository.findByTenantIdOrderByFullNameAsc(tenantId).forEach(p -> {
      if (p.getId() != null) {
        professionalNameById.put(p.getId().toString(), p.getFullName());
      }
    });

    return shifts.stream()
        .map(s -> toDto(s, professionalNameById))
        .toList();
  }

  private static AttendanceRowDto toDto(ShiftJpaEntity shift, Map<String, String> professionalNameById) {
    String professionalId = shift.getProfessionalId() == null ? null : shift.getProfessionalId().toString();
    String professionalName =
        professionalId == null ? null : professionalNameById.getOrDefault(professionalId, null);

    int scheduledMinutes = (int) Duration.between(shift.getStartTime(), shift.getEndTime()).toMinutes();
    Integer workedMinutes = null;
    if (shift.getCheckInAt() != null && shift.getCheckOutAt() != null) {
      workedMinutes = (int) Duration.between(shift.getCheckInAt(), shift.getCheckOutAt()).toMinutes();
    }
    Integer deltaMinutes = workedMinutes == null ? null : workedMinutes - scheduledMinutes;

    return new AttendanceRowDto(
        shift.getId().toString(),
        shift.getScheduleId().toString(),
        professionalId,
        professionalName,
        shift.getStartTime(),
        shift.getEndTime(),
        shift.getCheckInAt(),
        shift.getCheckOutAt(),
        shift.getStatus(),
        scheduledMinutes,
        workedMinutes,
        deltaMinutes
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
}
