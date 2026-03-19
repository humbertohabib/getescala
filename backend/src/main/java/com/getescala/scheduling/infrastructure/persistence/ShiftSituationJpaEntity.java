package com.getescala.scheduling.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "shift_situations")
public class ShiftSituationJpaEntity {
  @Id
  @UuidGenerator
  private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(nullable = false)
  private String code;

  @Column(nullable = false)
  private String name;

  @Column(name = "requires_coverage", nullable = false)
  private boolean requiresCoverage;

  @Column(name = "is_system", nullable = false)
  private boolean isSystem;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  protected ShiftSituationJpaEntity() {}

  public ShiftSituationJpaEntity(UUID tenantId, String code, String name, boolean requiresCoverage, boolean isSystem) {
    this.tenantId = tenantId;
    this.code = code;
    this.name = name;
    this.requiresCoverage = requiresCoverage;
    this.isSystem = isSystem;
  }

  public UUID getId() {
    return id;
  }

  public UUID getTenantId() {
    return tenantId;
  }

  public String getCode() {
    return code;
  }

  public String getName() {
    return name;
  }

  public boolean isRequiresCoverage() {
    return requiresCoverage;
  }

  public boolean isSystem() {
    return isSystem;
  }

  public void setName(String name) {
    this.name = name;
  }

  public void setRequiresCoverage(boolean requiresCoverage) {
    this.requiresCoverage = requiresCoverage;
  }
}
