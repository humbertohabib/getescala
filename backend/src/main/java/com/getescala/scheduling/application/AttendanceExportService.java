package com.getescala.scheduling.application;

import com.getescala.scheduling.infrastructure.persistence.ShiftJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.ShiftJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.ShiftTypeJpaRepository;
import com.getescala.tenant.TenantContext;
import com.getescala.workforce.infrastructure.persistence.ProfessionalJpaRepository;
import java.nio.charset.StandardCharsets;
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
public class AttendanceExportService {
  private final ShiftJpaRepository shiftRepository;
  private final ShiftTypeJpaRepository shiftTypeRepository;
  private final ProfessionalJpaRepository professionalRepository;

  public AttendanceExportService(
      ShiftJpaRepository shiftRepository,
      ShiftTypeJpaRepository shiftTypeRepository,
      ProfessionalJpaRepository professionalRepository
  ) {
    this.shiftRepository = shiftRepository;
    this.shiftTypeRepository = shiftTypeRepository;
    this.professionalRepository = professionalRepository;
  }

  @Transactional(readOnly = true)
  public byte[] exportCsv(OffsetDateTime from, OffsetDateTime to, String scheduleId, String professionalId, String kind) {
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
    List<ShiftJpaEntity> shifts = shiftRepository.findByFiltersOrderByStartTimeAsc(
        tenantId,
        fromValue,
        toValue,
        scheduleUuid,
        professionalUuid,
        normalizedKind
    );

    Map<String, String> professionalNameById = new HashMap<>();
    professionalRepository.findByTenantIdOrderByFullNameAsc(tenantId).forEach(p -> {
      if (p.getId() != null) {
        professionalNameById.put(p.getId().toString(), p.getFullName());
      }
    });

    StringBuilder csv = new StringBuilder();
    csv.append("shiftId,scheduleId,professionalId,professionalName,startTime,endTime,kind,checkInAt,checkOutAt,status,scheduledMinutes,workedMinutes,deltaMinutes,valueCents,currency\n");
    for (ShiftJpaEntity s : shifts) {
      String shiftProfessionalId = s.getProfessionalId() == null ? "" : s.getProfessionalId().toString();
      String professionalName =
          shiftProfessionalId.isBlank() ? "" : (professionalNameById.getOrDefault(shiftProfessionalId, ""));

      int scheduledMinutes = (int) Duration.between(s.getStartTime(), s.getEndTime()).toMinutes();
      String workedMinutes = "";
      String deltaMinutes = "";
      if (s.getCheckInAt() != null && s.getCheckOutAt() != null) {
        int worked = (int) Duration.between(s.getCheckInAt(), s.getCheckOutAt()).toMinutes();
        workedMinutes = Integer.toString(worked);
        deltaMinutes = Integer.toString(worked - scheduledMinutes);
      }

      csv.append(escape(s.getId().toString())).append(',')
          .append(escape(s.getScheduleId().toString())).append(',')
          .append(escape(shiftProfessionalId)).append(',')
          .append(escape(professionalName)).append(',')
          .append(escape(s.getStartTime().toString())).append(',')
          .append(escape(s.getEndTime().toString())).append(',')
          .append(escape(s.getKind())).append(',')
          .append(escape(s.getCheckInAt() == null ? "" : s.getCheckInAt().toString())).append(',')
          .append(escape(s.getCheckOutAt() == null ? "" : s.getCheckOutAt().toString())).append(',')
          .append(escape(s.getStatus())).append(',')
          .append(escape(Integer.toString(scheduledMinutes))).append(',')
          .append(escape(workedMinutes)).append(',')
          .append(escape(deltaMinutes)).append(',')
          .append(escape(s.getValueCents() == null ? "" : s.getValueCents().toString())).append(',')
          .append(escape(s.getCurrency() == null ? "" : s.getCurrency()))
          .append('\n');
    }

    return csv.toString().getBytes(StandardCharsets.UTF_8);
  }

  private static String escape(String value) {
    if (value == null) return "";
    boolean needsQuotes = value.contains(",") || value.contains("\"") || value.contains("\n") || value.contains("\r");
    if (!needsQuotes) return value;
    return "\"" + value.replace("\"", "\"\"") + "\"";
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

  private static String normalizeKind(String kind) {
    if (kind == null) return null;
    String trimmed = kind.trim();
    if (trimmed.isBlank()) return null;
    return trimmed.toUpperCase().replace(' ', '_');
  }
}
