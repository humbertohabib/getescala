package com.getescala.scheduling.application;

import com.getescala.scheduling.infrastructure.persistence.ScheduleJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.ScheduleJpaRepository;
import com.getescala.tenant.TenantContext;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ScheduleService {
  public record ScheduleDto(String id, LocalDate monthReference, String status) {}

  public record CreateScheduleRequest(LocalDate monthReference) {}

  private final ScheduleJpaRepository scheduleRepository;

  public ScheduleService(ScheduleJpaRepository scheduleRepository) {
    this.scheduleRepository = scheduleRepository;
  }

  @Transactional(readOnly = true)
  public List<ScheduleDto> list(LocalDate from, LocalDate to) {
    UUID tenantId = currentTenantId();
    return scheduleRepository.findByTenantIdOrderByMonthReferenceAsc(tenantId).stream()
        .filter(s -> from == null || !s.getMonthReference().isBefore(from))
        .filter(s -> to == null || !s.getMonthReference().isAfter(to))
        .map(ScheduleService::toDto)
        .toList();
  }

  @Transactional
  public ScheduleDto create(CreateScheduleRequest request) {
    UUID tenantId = currentTenantId();
    LocalDate monthReference = required(request.monthReference(), "monthReference").withDayOfMonth(1);

    ScheduleJpaEntity schedule = scheduleRepository.findByTenantIdAndMonthReference(tenantId, monthReference)
        .orElseGet(() -> scheduleRepository.save(new ScheduleJpaEntity(tenantId, monthReference)));

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

  private static ScheduleDto toDto(ScheduleJpaEntity entity) {
    return new ScheduleDto(entity.getId().toString(), entity.getMonthReference(), entity.getStatus());
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
