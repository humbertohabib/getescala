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
@Table(name = "organization_types")
public class OrganizationTypeJpaEntity {
  @Id
  @UuidGenerator
  private UUID id;

  @Column(name = "segment_id", nullable = false)
  private UUID segmentId;

  @Column(nullable = false)
  private String name;

  @Column(name = "user_term", nullable = false)
  private String userTerm;

  @Column(name = "shift_term", nullable = false)
  private String shiftTerm;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  protected OrganizationTypeJpaEntity() {}

  public OrganizationTypeJpaEntity(UUID segmentId, String name, String userTerm, String shiftTerm) {
    this.segmentId = segmentId;
    this.name = name;
    this.userTerm = userTerm;
    this.shiftTerm = shiftTerm;
  }

  public UUID getId() {
    return id;
  }

  public UUID getSegmentId() {
    return segmentId;
  }

  public void setSegmentId(UUID segmentId) {
    this.segmentId = segmentId;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getUserTerm() {
    return userTerm;
  }

  public void setUserTerm(String userTerm) {
    this.userTerm = userTerm;
  }

  public String getShiftTerm() {
    return shiftTerm;
  }

  public void setShiftTerm(String shiftTerm) {
    this.shiftTerm = shiftTerm;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }
}
