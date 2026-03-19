package com.getescala.identity.infrastructure.persistence;

import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class UserJpaEntity {
  @Id
  @UuidGenerator
  private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "full_name")
  private String fullName;

  @Column(nullable = false)
  private String email;

  @Column(name = "email_global_key")
  private String emailGlobalKey;

  @Column(name = "password_hash", nullable = false)
  private String passwordHash;

  @Column(name = "auth_provider", nullable = false)
  private String authProvider;

  @Column(nullable = false)
  private String status;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  protected UserJpaEntity() {}

  public UserJpaEntity(UUID tenantId, String email, String passwordHash, String authProvider) {
    this.tenantId = tenantId;
    this.email = email;
    this.emailGlobalKey = email;
    this.passwordHash = passwordHash;
    this.authProvider = authProvider;
    this.status = "ACTIVE";
  }

  public UUID getId() {
    return id;
  }

  public UUID getTenantId() {
    return tenantId;
  }

  public String getFullName() {
    return fullName;
  }

  public void setFullName(String fullName) {
    this.fullName = fullName;
  }

  public String getEmail() {
    return email;
  }

  public String getEmailGlobalKey() {
    return emailGlobalKey;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public String getAuthProvider() {
    return authProvider;
  }

  public String getStatus() {
    return status;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }
}
