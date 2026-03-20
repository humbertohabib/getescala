package com.getescala.workforce.infrastructure.persistence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfessionalCompensationValueJpaRepository extends JpaRepository<ProfessionalCompensationValueJpaEntity, UUID> {
  List<ProfessionalCompensationValueJpaEntity> findByTenantIdAndProfessionalIdOrderByPeriodStartDesc(UUID tenantId, UUID professionalId);
}

