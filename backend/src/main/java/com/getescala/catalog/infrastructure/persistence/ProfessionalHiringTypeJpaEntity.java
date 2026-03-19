package com.getescala.catalog.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "professional_hiring_types")
public class ProfessionalHiringTypeJpaEntity {
  @Id
  @UuidGenerator
  private UUID id;

  @Column(name = "tenant_id")
  private UUID tenantId;

  @Column(name = "organization_type_id")
  private UUID organizationTypeId;

  @Column(nullable = false)
  private String name;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  protected ProfessionalHiringTypeJpaEntity() {}

  public ProfessionalHiringTypeJpaEntity(UUID tenantId, UUID organizationTypeId, String name, int sortOrder) {
    this.tenantId = tenantId;
    this.organizationTypeId = organizationTypeId;
    this.name = name;
    this.sortOrder = sortOrder;
  }

  public UUID getId() {
    return id;
  }

  public UUID getTenantId() {
    return tenantId;
  }

  public UUID getOrganizationTypeId() {
    return organizationTypeId;
  }

  public String getName() {
    return name;
  }

  public int getSortOrder() {
    return sortOrder;
  }

  public void setName(String name) {
    this.name = name;
  }

  public void setSortOrder(int sortOrder) {
    this.sortOrder = sortOrder;
  }
}
