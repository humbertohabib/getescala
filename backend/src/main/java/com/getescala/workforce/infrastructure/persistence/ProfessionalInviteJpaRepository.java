package com.getescala.workforce.infrastructure.persistence;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfessionalInviteJpaRepository extends JpaRepository<ProfessionalInviteJpaEntity, UUID> {
  Optional<ProfessionalInviteJpaEntity> findByTokenHash(String tokenHash);
}
