package com.getescala.scheduling.infrastructure.persistence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SectorJpaRepository extends JpaRepository<SectorJpaEntity, UUID> {
  List<SectorJpaEntity> findByTenantIdOrderByNameAsc(UUID tenantId);

  List<SectorJpaEntity> findByTenantIdAndLocationIdOrderByNameAsc(UUID tenantId, UUID locationId);
}
