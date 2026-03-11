package com.getescala.tenant.infrastructure.persistence;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TenantJpaRepository extends JpaRepository<TenantJpaEntity, UUID> {
  Optional<TenantJpaEntity> findByStripeCustomerId(String stripeCustomerId);

  Optional<TenantJpaEntity> findByStripeSubscriptionId(String stripeSubscriptionId);
}
