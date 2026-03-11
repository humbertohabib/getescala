package com.getescala.scheduling.infrastructure.persistence;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScheduleJpaRepository extends JpaRepository<ScheduleJpaEntity, UUID> {
  List<ScheduleJpaEntity> findByTenantIdOrderByMonthReferenceAsc(UUID tenantId);

  Optional<ScheduleJpaEntity> findByTenantIdAndMonthReference(UUID tenantId, LocalDate monthReference);
}
