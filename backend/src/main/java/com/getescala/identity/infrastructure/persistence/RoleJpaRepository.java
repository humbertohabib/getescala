package com.getescala.identity.infrastructure.persistence;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleJpaRepository extends JpaRepository<RoleJpaEntity, UUID> {
  Optional<RoleJpaEntity> findByTenantIdAndCode(UUID tenantId, String code);
}
