package com.getescala.catalog.infrastructure.persistence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfessionalPrefixJpaRepository extends JpaRepository<ProfessionalPrefixJpaEntity, UUID> {
  List<ProfessionalPrefixJpaEntity> findAllByTenantIdOrderBySortOrderAscNameAsc(UUID tenantId);

  List<ProfessionalPrefixJpaEntity> findAllByOrganizationTypeIdOrderBySortOrderAscNameAsc(UUID organizationTypeId);
}
