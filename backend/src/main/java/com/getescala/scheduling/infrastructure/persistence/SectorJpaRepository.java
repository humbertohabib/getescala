package com.getescala.scheduling.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SectorJpaRepository extends JpaRepository<SectorJpaEntity, UUID> {
  List<SectorJpaEntity> findByTenantIdOrderByNameAsc(UUID tenantId);

  List<SectorJpaEntity> findByTenantIdAndLocationIdOrderByNameAsc(UUID tenantId, UUID locationId);

  List<SectorJpaEntity> findByTenantIdAndEnabledTrueOrderByNameAsc(UUID tenantId);

  List<SectorJpaEntity> findByTenantIdAndLocationIdAndEnabledTrueOrderByNameAsc(UUID tenantId, UUID locationId);

  Optional<SectorJpaEntity> findByTenantIdAndId(UUID tenantId, UUID id);

  long countByTenantIdAndLocationId(UUID tenantId, UUID locationId);

  long countByTenantIdAndLocationIdAndEnabledTrue(UUID tenantId, UUID locationId);
}
