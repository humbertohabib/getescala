package com.getescala.scheduling.infrastructure.persistence;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShiftAnnouncementJpaRepository extends JpaRepository<ShiftAnnouncementJpaEntity, UUID> {
  boolean existsByTenantIdAndShiftIdAndStatus(UUID tenantId, UUID shiftId, String status);
}
