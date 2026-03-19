package com.getescala.scheduling.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LocationJpaRepository extends JpaRepository<LocationJpaEntity, UUID> {
  List<LocationJpaEntity> findByTenantIdOrderByNameAsc(UUID tenantId);

  List<LocationJpaEntity> findByTenantIdAndEnabledTrueOrderByNameAsc(UUID tenantId);

  Optional<LocationJpaEntity> findByTenantIdAndId(UUID tenantId, UUID id);
}
