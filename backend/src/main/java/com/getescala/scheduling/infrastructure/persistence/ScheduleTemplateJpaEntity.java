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
@Table(name = "schedule_templates")
public class ScheduleTemplateJpaEntity {
  @Id
  @UuidGenerator
  private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "sector_id", nullable = false)
  private UUID sectorId;

  @Column(nullable = false)
  private String name;

  @Column(name = "weeks_count", nullable = false)
  private int weeksCount;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  protected ScheduleTemplateJpaEntity() {}

  public ScheduleTemplateJpaEntity(UUID tenantId, UUID sectorId, String name, int weeksCount) {
    this.tenantId = tenantId;
    this.sectorId = sectorId;
    this.name = name;
    this.weeksCount = weeksCount;
  }

  public UUID getId() {
    return id;
  }

  public UUID getTenantId() {
    return tenantId;
  }

  public UUID getSectorId() {
    return sectorId;
  }

  public String getName() {
    return name;
  }

  public int getWeeksCount() {
    return weeksCount;
  }

  public void update(String name, int weeksCount) {
    this.name = name;
    this.weeksCount = weeksCount;
  }
}
