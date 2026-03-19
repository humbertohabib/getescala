package com.getescala.scheduling.infrastructure.persistence;

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
@Table(name = "shifts")
public class ShiftJpaEntity {
  @Id
  @UuidGenerator
  private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "schedule_id", nullable = false)
  private UUID scheduleId;

  @Column(name = "professional_id")
  private UUID professionalId;

  @Column(name = "start_time", nullable = false)
  private OffsetDateTime startTime;

  @Column(name = "end_time", nullable = false)
  private OffsetDateTime endTime;

  @Column(nullable = false)
  private String kind;

  @Column(nullable = false)
  private String status;

  @Column(name = "value_cents")
  private Integer valueCents;

  @Column
  private String currency;

  @Column(name = "check_in_at")
  private OffsetDateTime checkInAt;

  @Column(name = "check_out_at")
  private OffsetDateTime checkOutAt;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  protected ShiftJpaEntity() {}

  public ShiftJpaEntity(
      UUID tenantId,
      UUID scheduleId,
      UUID professionalId,
      OffsetDateTime startTime,
      OffsetDateTime endTime,
      String kind,
      Integer valueCents,
      String currency
  ) {
    this.tenantId = tenantId;
    this.scheduleId = scheduleId;
    this.professionalId = professionalId;
    this.startTime = startTime;
    this.endTime = endTime;
    this.kind = kind == null || kind.isBlank() ? "NORMAL" : kind;
    this.valueCents = valueCents;
    this.currency = currency;
    this.status = "DRAFT";
  }

  public UUID getId() {
    return id;
  }

  public UUID getTenantId() {
    return tenantId;
  }

  public UUID getScheduleId() {
    return scheduleId;
  }

  public UUID getProfessionalId() {
    return professionalId;
  }

  public OffsetDateTime getStartTime() {
    return startTime;
  }

  public OffsetDateTime getEndTime() {
    return endTime;
  }

  public String getKind() {
    return kind;
  }

  public String getStatus() {
    return status;
  }

  public Integer getValueCents() {
    return valueCents;
  }

  public String getCurrency() {
    return currency;
  }

  public OffsetDateTime getCheckInAt() {
    return checkInAt;
  }

  public OffsetDateTime getCheckOutAt() {
    return checkOutAt;
  }

  public void updateDetails(
      UUID professionalId,
      OffsetDateTime startTime,
      OffsetDateTime endTime,
      String kind,
      Integer valueCents,
      String currency
  ) {
    this.professionalId = professionalId;
    this.startTime = startTime;
    this.endTime = endTime;
    this.kind = kind == null || kind.isBlank() ? this.kind : kind;
    this.valueCents = valueCents;
    this.currency = currency;
  }

  public void checkIn(OffsetDateTime at) {
    this.checkInAt = at;
  }

  public void checkOut(OffsetDateTime at) {
    this.checkOutAt = at;
    this.status = "COMPLETED";
  }

  public void cancel() {
    this.status = "CANCELLED";
  }
}
