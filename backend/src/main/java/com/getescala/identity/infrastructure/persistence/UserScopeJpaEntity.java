package com.getescala.identity.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "user_scopes")
public class UserScopeJpaEntity {
  @Id
  @UuidGenerator
  private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @Column(name = "scope_type", nullable = false)
  private String scopeType;

  @Column(name = "location_id")
  private UUID locationId;

  @Column(name = "sector_id")
  private UUID sectorId;

  @Column(name = "group_id")
  private UUID groupId;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  protected UserScopeJpaEntity() {}

  public UserScopeJpaEntity(UUID tenantId, UUID userId, String scopeType, UUID locationId, UUID sectorId, UUID groupId) {
    this.tenantId = tenantId;
    this.userId = userId;
    this.scopeType = scopeType;
    this.locationId = locationId;
    this.sectorId = sectorId;
    this.groupId = groupId;
  }

  public UUID getId() {
    return id;
  }

  public UUID getTenantId() {
    return tenantId;
  }

  public UUID getUserId() {
    return userId;
  }

  public String getScopeType() {
    return scopeType;
  }

  public UUID getLocationId() {
    return locationId;
  }

  public UUID getSectorId() {
    return sectorId;
  }

  public UUID getGroupId() {
    return groupId;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }
}
