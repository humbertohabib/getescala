package com.getescala.scheduling.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShiftSituationJpaRepository extends JpaRepository<ShiftSituationJpaEntity, UUID> {
  boolean existsByTenantIdAndCode(UUID tenantId, String code);

  boolean existsByTenantIdAndName(UUID tenantId, String name);

  Optional<ShiftSituationJpaEntity> findByTenantIdAndId(UUID tenantId, UUID id);

  Optional<ShiftSituationJpaEntity> findByTenantIdAndCode(UUID tenantId, String code);

  List<ShiftSituationJpaEntity> findByTenantIdOrderByNameAsc(UUID tenantId);
}
