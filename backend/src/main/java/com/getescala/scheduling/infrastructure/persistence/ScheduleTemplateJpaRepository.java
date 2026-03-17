package com.getescala.scheduling.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScheduleTemplateJpaRepository extends JpaRepository<ScheduleTemplateJpaEntity, UUID> {
  List<ScheduleTemplateJpaEntity> findByTenantIdAndSectorIdOrderByNameAsc(UUID tenantId, UUID sectorId);

  Optional<ScheduleTemplateJpaEntity> findByTenantIdAndId(UUID tenantId, UUID id);
}
