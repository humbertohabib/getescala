package com.getescala.catalog.infrastructure.persistence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfessionalHiringTypeJpaRepository extends JpaRepository<ProfessionalHiringTypeJpaEntity, UUID> {
  List<ProfessionalHiringTypeJpaEntity> findAllByTenantIdOrderBySortOrderAscNameAsc(UUID tenantId);

  List<ProfessionalHiringTypeJpaEntity> findAllByOrganizationTypeIdOrderBySortOrderAscNameAsc(UUID organizationTypeId);
}
