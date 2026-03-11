package com.getescala.scheduling.infrastructure.persistence;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "schedules")
public class ScheduleJpaEntity {
  @Id
  @UuidGenerator
  private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "location_id")
  private UUID locationId;

  @Column(name = "sector_id")
  private UUID sectorId;

  @Column(name = "month_reference", nullable = false)
  private LocalDate monthReference;

  @Column(nullable = false)
  private String status;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  protected ScheduleJpaEntity() {}

  public ScheduleJpaEntity(UUID tenantId, LocalDate monthReference) {
    this.tenantId = tenantId;
    this.monthReference = monthReference;
    this.status = "DRAFT";
  }

  public UUID getId() {
    return id;
  }

  public UUID getTenantId() {
    return tenantId;
  }

  public LocalDate getMonthReference() {
    return monthReference;
  }

  public String getStatus() {
    return status;
  }

  public void publish() {
    this.status = "PUBLISHED";
  }

  public void lock() {
    this.status = "LOCKED";
  }
}
