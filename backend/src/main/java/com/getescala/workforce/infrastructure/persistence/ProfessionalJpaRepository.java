package com.getescala.workforce.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfessionalJpaRepository extends JpaRepository<ProfessionalJpaEntity, UUID> {
  List<ProfessionalJpaEntity> findByTenantIdOrderByFullNameAsc(UUID tenantId);

  List<ProfessionalJpaEntity> findByTenantIdAndIdInOrderByFullNameAsc(UUID tenantId, List<UUID> ids);

  Optional<ProfessionalJpaEntity> findByTenantIdAndId(UUID tenantId, UUID id);

  boolean existsByTenantIdAndId(UUID tenantId, UUID id);

  long countByTenantId(UUID tenantId);
}
