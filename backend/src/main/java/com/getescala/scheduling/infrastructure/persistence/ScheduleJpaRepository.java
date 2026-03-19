package com.getescala.scheduling.infrastructure.persistence;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ScheduleJpaRepository extends JpaRepository<ScheduleJpaEntity, UUID>, JpaSpecificationExecutor<ScheduleJpaEntity> {
  List<ScheduleJpaEntity> findByTenantIdOrderByMonthReferenceAsc(UUID tenantId);

  Optional<ScheduleJpaEntity> findByTenantIdAndMonthReference(UUID tenantId, LocalDate monthReference);

  @Query("""
      select s
      from ScheduleJpaEntity s
      where s.tenantId = :tenantId
        and s.monthReference = :monthReference
        and s.locationId is not distinct from :locationId
        and s.sectorId is not distinct from :sectorId
      """)
  Optional<ScheduleJpaEntity> findOneByTenantIdAndMonthReferenceAndLocationAndSector(
      @Param("tenantId") UUID tenantId,
      @Param("monthReference") LocalDate monthReference,
      @Param("locationId") UUID locationId,
      @Param("sectorId") UUID sectorId
  );

  long countByTenantIdAndLocationId(UUID tenantId, UUID locationId);

  long countByTenantIdAndSectorId(UUID tenantId, UUID sectorId);
}
