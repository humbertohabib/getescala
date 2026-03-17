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

  @Column(name = "published_until")
  private LocalDate publishedUntil;

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

  public ScheduleJpaEntity(UUID tenantId, UUID locationId, UUID sectorId, LocalDate monthReference) {
    this.tenantId = tenantId;
    this.locationId = locationId;
    this.sectorId = sectorId;
    this.monthReference = monthReference;
    this.status = "DRAFT";
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

  public UUID getSectorId() {
    return sectorId;
  }

  public LocalDate getMonthReference() {
    return monthReference;
  }

  public String getStatus() {
    return status;
  }

  public LocalDate getPublishedUntil() {
    return publishedUntil;
  }

  public void publish() {
    publish(null);
  }

  public void publish(LocalDate publishedUntil) {
    this.status = "PUBLISHED";
    this.publishedUntil = publishedUntil;
  }

  public void lock() {
    this.status = "LOCKED";
  }
}
