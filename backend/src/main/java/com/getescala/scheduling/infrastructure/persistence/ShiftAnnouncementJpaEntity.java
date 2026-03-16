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
@Table(name = "shift_announcements")
public class ShiftAnnouncementJpaEntity {
  @Id
  @UuidGenerator
  private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "shift_id", nullable = false)
  private UUID shiftId;

  @Column(nullable = false)
  private String status;

  @Column(name = "created_by")
  private UUID createdBy;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "accepted_by")
  private UUID acceptedBy;

  @Column(name = "accepted_at")
  private OffsetDateTime acceptedAt;

  protected ShiftAnnouncementJpaEntity() {}

  public ShiftAnnouncementJpaEntity(UUID tenantId, UUID shiftId, UUID createdBy) {
    this.tenantId = tenantId;
    this.shiftId = shiftId;
    this.createdBy = createdBy;
    this.status = "OPEN";
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

  public String getStatus() {
    return status;
  }
}
