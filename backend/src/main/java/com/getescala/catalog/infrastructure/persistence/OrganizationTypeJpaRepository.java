package com.getescala.catalog.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationTypeJpaRepository extends JpaRepository<OrganizationTypeJpaEntity, UUID> {
  List<OrganizationTypeJpaEntity> findAllBySegmentIdOrderByNameAsc(UUID segmentId);

  List<OrganizationTypeJpaEntity> findAllByOrderByNameAsc();

  Optional<OrganizationTypeJpaEntity> findFirstByNameIgnoreCase(String name);
}
