package com.getescala.settings.infrastructure.persistence;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BonusValueJpaRepository extends JpaRepository<BonusValueJpaEntity, UUID> {
  List<BonusValueJpaEntity> findByTenantIdAndSectorIdAndPeriodStartAndPeriodEnd(
      UUID tenantId,
      UUID sectorId,
      LocalDate periodStart,
      LocalDate periodEnd
  );

  void deleteByTenantIdAndSectorIdAndPeriodStartAndPeriodEnd(UUID tenantId, UUID sectorId, LocalDate periodStart, LocalDate periodEnd);
}

