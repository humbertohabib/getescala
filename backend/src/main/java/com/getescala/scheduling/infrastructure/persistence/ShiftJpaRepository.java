package com.getescala.scheduling.infrastructure.persistence;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ShiftJpaRepository extends JpaRepository<ShiftJpaEntity, UUID> {
  @Query("""
      select s
      from ShiftJpaEntity s
      where s.tenantId = :tenantId
        and s.startTime >= :from
        and s.startTime <= :to
        and (:scheduleId is null or s.scheduleId = :scheduleId)
        and (:professionalId is null or s.professionalId = :professionalId)
        and (:kind is null or s.kind = :kind)
      order by s.startTime asc
      """)
  List<ShiftJpaEntity> findByFiltersOrderByStartTimeAsc(
      @Param("tenantId") UUID tenantId,
      @Param("from") OffsetDateTime from,
      @Param("to") OffsetDateTime to,
      @Param("scheduleId") UUID scheduleId,
      @Param("professionalId") UUID professionalId,
      @Param("kind") String kind
  );

  List<ShiftJpaEntity> findByTenantIdAndStartTimeBetweenOrderByStartTimeAsc(
      UUID tenantId,
      OffsetDateTime from,
      OffsetDateTime to
  );

  List<ShiftJpaEntity> findByTenantIdAndScheduleIdOrderByStartTimeAsc(UUID tenantId, UUID scheduleId);

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

  @Query("""
      select distinct sh.professionalId
      from ShiftJpaEntity sh, ScheduleJpaEntity sc
      where sh.scheduleId = sc.id
        and sh.tenantId = :tenantId
        and sc.tenantId = :tenantId
        and sc.sectorId = :sectorId
        and sh.professionalId is not null
        and sh.status <> 'CANCELLED'
      """)
  List<UUID> findDistinctProfessionalIdsByTenantIdAndSectorId(
      @Param("tenantId") UUID tenantId,
      @Param("sectorId") UUID sectorId
  );

  boolean existsByTenantIdAndKind(UUID tenantId, String kind);

  boolean existsByTenantIdAndSituationCode(UUID tenantId, String situationCode);
}
