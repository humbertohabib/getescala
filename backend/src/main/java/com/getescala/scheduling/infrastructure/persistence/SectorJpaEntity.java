package com.getescala.scheduling.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "sectors")
public class SectorJpaEntity {
  @Id
  @UuidGenerator
  private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "location_id")
  private UUID locationId;

  @Column(nullable = false)
  private String name;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  protected SectorJpaEntity() {}

  public SectorJpaEntity(UUID tenantId, UUID locationId, String name) {
    this.tenantId = tenantId;
    this.locationId = locationId;
    this.name = name;
  }

  public UUID getId() {
    return id;
  }

  public UUID getTenantId() {
    return tenantId;
  }

  public UUID getLocationId() {
    return locationId;
  }

  public String getName() {
    return name;
  }
}
