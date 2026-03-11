package com.getescala.workforce.infrastructure.persistence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfessionalJpaRepository extends JpaRepository<ProfessionalJpaEntity, UUID> {
  List<ProfessionalJpaEntity> findByTenantIdOrderByFullNameAsc(UUID tenantId);

  boolean existsByTenantIdAndId(UUID tenantId, UUID id);

  long countByTenantId(UUID tenantId);
}
