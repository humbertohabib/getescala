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
@Table(name = "segments")
public class SegmentJpaEntity {
  @Id
  @UuidGenerator
  private UUID id;

  @Column(nullable = false, unique = true)
  private String name;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  protected SegmentJpaEntity() {}

  public SegmentJpaEntity(String name) {
    this.name = name;
  }

  public UUID getId() {
    return id;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }
}
