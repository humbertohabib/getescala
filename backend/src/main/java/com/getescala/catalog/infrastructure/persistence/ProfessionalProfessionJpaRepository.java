package com.getescala.catalog.infrastructure.persistence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfessionalProfessionJpaRepository extends JpaRepository<ProfessionalProfessionJpaEntity, UUID> {
  List<ProfessionalProfessionJpaEntity> findAllByTenantIdOrderBySortOrderAscNameAsc(UUID tenantId);

  List<ProfessionalProfessionJpaEntity> findAllByOrganizationTypeIdOrderBySortOrderAscNameAsc(UUID organizationTypeId);
}
