package com.getescala.scheduling.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShiftTypeJpaRepository extends JpaRepository<ShiftTypeJpaEntity, UUID> {
  List<ShiftTypeJpaEntity> findByTenantIdOrderByNameAsc(UUID tenantId);

  Optional<ShiftTypeJpaEntity> findByTenantIdAndId(UUID tenantId, UUID id);

  boolean existsByTenantIdAndCode(UUID tenantId, String code);

  Optional<ShiftTypeJpaEntity> findByTenantIdAndCode(UUID tenantId, String code);
}
