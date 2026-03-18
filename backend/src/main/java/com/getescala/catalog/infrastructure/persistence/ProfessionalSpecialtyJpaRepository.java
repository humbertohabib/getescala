package com.getescala.catalog.infrastructure.persistence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfessionalSpecialtyJpaRepository extends JpaRepository<ProfessionalSpecialtyJpaEntity, UUID> {
  List<ProfessionalSpecialtyJpaEntity> findAllByTenantIdOrderBySortOrderAscNameAsc(UUID tenantId);

  List<ProfessionalSpecialtyJpaEntity> findAllByOrganizationTypeIdOrderBySortOrderAscNameAsc(UUID organizationTypeId);
}
