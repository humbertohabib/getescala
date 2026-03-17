package com.getescala.workforce.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "professional_invites")
public class ProfessionalInviteJpaEntity {
  @Id
  @UuidGenerator
  private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "professional_id", nullable = false)
  private UUID professionalId;

  @Column(nullable = false)
  private String email;

  @Column(name = "token_hash", nullable = false)
  private String tokenHash;

  @Column(nullable = false)
  private String status;

  @Column(name = "expires_at", nullable = false)
  private OffsetDateTime expiresAt;

  @Column(name = "created_by_user_id")
  private UUID createdByUserId;

  @Column(name = "accepted_at")
  private OffsetDateTime acceptedAt;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  protected ProfessionalInviteJpaEntity() {}

  public ProfessionalInviteJpaEntity(
      UUID tenantId,
      UUID professionalId,
      String email,
      String tokenHash,
      OffsetDateTime expiresAt,
      UUID createdByUserId
  ) {
    this.tenantId = tenantId;
    this.professionalId = professionalId;
    this.email = email;
    this.tokenHash = tokenHash;
    this.expiresAt = expiresAt;
    this.createdByUserId = createdByUserId;
    this.status = "PENDING";
  }

  public UUID getId() {
    return id;
  }

  public UUID getTenantId() {
    return tenantId;
  }

  public UUID getProfessionalId() {
    return professionalId;
  }

  public String getEmail() {
    return email;
  }

  public String getTokenHash() {
    return tokenHash;
  }

  public String getStatus() {
    return status;
  }

  public OffsetDateTime getExpiresAt() {
    return expiresAt;
  }

  public UUID getCreatedByUserId() {
    return createdByUserId;
  }

  public OffsetDateTime getAcceptedAt() {
    return acceptedAt;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }

  public void markAccepted(OffsetDateTime at) {
    this.status = "ACCEPTED";
    this.acceptedAt = at;
  }
}
