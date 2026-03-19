package com.getescala.scheduling.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScheduleTemplateShiftJpaRepository extends JpaRepository<ScheduleTemplateShiftJpaEntity, UUID> {
  List<ScheduleTemplateShiftJpaEntity> findByTenantIdAndTemplateIdOrderByWeekIndexAscDayOfWeekAscStartTimeAsc(
      UUID tenantId,
      UUID templateId
  );

  Optional<ScheduleTemplateShiftJpaEntity> findByTenantIdAndId(UUID tenantId, UUID id);

  void deleteByTenantIdAndTemplateId(UUID tenantId, UUID templateId);

  void deleteByTenantIdAndTemplateIdAndWeekIndexGreaterThan(UUID tenantId, UUID templateId, int weekIndex);

  boolean existsByTenantIdAndKind(UUID tenantId, String kind);
}
