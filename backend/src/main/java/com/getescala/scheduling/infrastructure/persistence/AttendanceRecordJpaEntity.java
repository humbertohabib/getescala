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
@Table(name = "attendance_records")
public class AttendanceRecordJpaEntity {
  @Id
  @UuidGenerator
  private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "shift_id", nullable = false)
  private UUID shiftId;

  @Column(name = "professional_id")
  private UUID professionalId;

  @Column(name = "check_in_at")
  private OffsetDateTime checkInAt;

  @Column(name = "check_out_at")
  private OffsetDateTime checkOutAt;

  @Column(columnDefinition = "jsonb")
  private String metadata;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  protected AttendanceRecordJpaEntity() {}

  public AttendanceRecordJpaEntity(UUID tenantId, UUID shiftId, UUID professionalId, OffsetDateTime checkInAt) {
    this.tenantId = tenantId;
    this.shiftId = shiftId;
    this.professionalId = professionalId;
    this.checkInAt = checkInAt;
  }

  public UUID getId() {
    return id;
  }

  public UUID getTenantId() {
    return tenantId;
  }

  public UUID getShiftId() {
    return shiftId;
  }

  public UUID getProfessionalId() {
    return professionalId;
  }

  public OffsetDateTime getCheckInAt() {
    return checkInAt;
  }

  public OffsetDateTime getCheckOutAt() {
    return checkOutAt;
  }

  public void setCheckOutAt(OffsetDateTime checkOutAt) {
    this.checkOutAt = checkOutAt;
  }
}
