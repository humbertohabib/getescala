package com.getescala.identity.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserJpaRepository extends JpaRepository<UserJpaEntity, UUID> {
  Optional<UserJpaEntity> findByTenantIdAndEmail(UUID tenantId, String email);

  List<UserJpaEntity> findByEmailOrderByCreatedAtAsc(String email);
}
