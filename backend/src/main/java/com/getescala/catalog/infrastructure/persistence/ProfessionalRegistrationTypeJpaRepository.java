package com.getescala.catalog.infrastructure.persistence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfessionalRegistrationTypeJpaRepository extends JpaRepository<ProfessionalRegistrationTypeJpaEntity, UUID> {
  List<ProfessionalRegistrationTypeJpaEntity> findAllByTenantIdOrderBySortOrderAscNameAsc(UUID tenantId);

  List<ProfessionalRegistrationTypeJpaEntity> findAllByOrganizationTypeIdOrderBySortOrderAscNameAsc(UUID organizationTypeId);
}
