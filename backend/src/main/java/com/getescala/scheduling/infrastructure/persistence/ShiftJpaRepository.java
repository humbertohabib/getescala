package com.getescala.scheduling.infrastructure.persistence;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ShiftJpaRepository extends JpaRepository<ShiftJpaEntity, UUID> {
  List<ShiftJpaEntity> findByTenantIdAndStartTimeBetweenOrderByStartTimeAsc(
      UUID tenantId,
      OffsetDateTime from,
      OffsetDateTime to
  );

  List<ShiftJpaEntity> findByTenantIdAndScheduleIdAndStartTimeBetweenOrderByStartTimeAsc(
      UUID tenantId,
      UUID scheduleId,
      OffsetDateTime from,
      OffsetDateTime to
  );

  List<ShiftJpaEntity> findByTenantIdAndProfessionalIdAndStartTimeBetweenOrderByStartTimeAsc(
      UUID tenantId,
      UUID professionalId,
      OffsetDateTime from,
      OffsetDateTime to
  );

  List<ShiftJpaEntity> findByTenantIdAndScheduleIdAndProfessionalIdAndStartTimeBetweenOrderByStartTimeAsc(
      UUID tenantId,
      UUID scheduleId,
      UUID professionalId,
      OffsetDateTime from,
      OffsetDateTime to
  );

  @Query("""
      select case when count(s) > 0 then true else false end
      from ShiftJpaEntity s
      where s.tenantId = :tenantId
        and s.professionalId = :professionalId
        and s.id <> coalesce(:excludeId, s.id)
        and s.startTime < :endTime
        and s.endTime > :startTime
        and s.status <> 'CANCELLED'
      """)
  boolean existsOverlap(
      @Param("tenantId") UUID tenantId,
      @Param("professionalId") UUID professionalId,
      @Param("startTime") OffsetDateTime startTime,
      @Param("endTime") OffsetDateTime endTime,
      @Param("excludeId") UUID excludeId
  );
}
