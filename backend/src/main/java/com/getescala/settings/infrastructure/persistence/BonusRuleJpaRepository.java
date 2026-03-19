package com.getescala.settings.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BonusRuleJpaRepository extends JpaRepository<BonusRuleJpaEntity, UUID> {
  List<BonusRuleJpaEntity> findByTenantIdOrderByNameAsc(UUID tenantId);

  Optional<BonusRuleJpaEntity> findByTenantIdAndId(UUID tenantId, UUID id);
}
