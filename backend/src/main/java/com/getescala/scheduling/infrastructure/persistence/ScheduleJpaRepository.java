package com.getescala.scheduling.infrastructure.persistence;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ScheduleJpaRepository extends JpaRepository<ScheduleJpaEntity, UUID> {
  List<ScheduleJpaEntity> findByTenantIdOrderByMonthReferenceAsc(UUID tenantId);

  Optional<ScheduleJpaEntity> findByTenantIdAndMonthReference(UUID tenantId, LocalDate monthReference);

  @Query("""
      select s
      from ScheduleJpaEntity s
      where s.tenantId = :tenantId
        and (:from is null or s.monthReference >= :from)
        and (:to is null or s.monthReference <= :to)
        and (:locationId is null or s.locationId = :locationId)
        and (:sectorId is null or s.sectorId = :sectorId)
      order by s.monthReference asc
      """)
  List<ScheduleJpaEntity> findAllFiltered(
      @Param("tenantId") UUID tenantId,
      @Param("from") LocalDate from,
      @Param("to") LocalDate to,
      @Param("locationId") UUID locationId,
      @Param("sectorId") UUID sectorId
  );

  @Query("""
      select s
      from ScheduleJpaEntity s
      where s.tenantId = :tenantId
        and s.monthReference = :monthReference
        and ((:locationId is null and s.locationId is null) or s.locationId = :locationId)
        and ((:sectorId is null and s.sectorId is null) or s.sectorId = :sectorId)
      """)
  Optional<ScheduleJpaEntity> findOneByTenantIdAndMonthReferenceAndLocationAndSector(
      @Param("tenantId") UUID tenantId,
      @Param("monthReference") LocalDate monthReference,
      @Param("locationId") UUID locationId,
      @Param("sectorId") UUID sectorId
  );
}
