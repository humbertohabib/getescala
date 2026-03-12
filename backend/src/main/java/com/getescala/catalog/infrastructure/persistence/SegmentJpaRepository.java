package com.getescala.catalog.infrastructure.persistence;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SegmentJpaRepository extends JpaRepository<SegmentJpaEntity, UUID> {
  Optional<SegmentJpaEntity> findByNameIgnoreCase(String name);
}
