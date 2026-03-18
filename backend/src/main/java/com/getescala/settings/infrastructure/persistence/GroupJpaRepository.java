package com.getescala.settings.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupJpaRepository extends JpaRepository<GroupJpaEntity, UUID> {
  List<GroupJpaEntity> findByTenantIdOrderByNameAsc(UUID tenantId);

  Optional<GroupJpaEntity> findByTenantIdAndId(UUID tenantId, UUID id);
}
