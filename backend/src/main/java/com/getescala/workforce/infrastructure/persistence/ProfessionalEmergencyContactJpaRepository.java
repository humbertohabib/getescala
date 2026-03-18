package com.getescala.workforce.infrastructure.persistence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfessionalEmergencyContactJpaRepository extends JpaRepository<ProfessionalEmergencyContactJpaEntity, UUID> {
  List<ProfessionalEmergencyContactJpaEntity> findByTenantIdAndProfessionalIdOrderByCreatedAtAsc(UUID tenantId, UUID professionalId);

  void deleteByTenantIdAndProfessionalId(UUID tenantId, UUID professionalId);
}
