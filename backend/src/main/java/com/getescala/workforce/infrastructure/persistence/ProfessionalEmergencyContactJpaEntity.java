package com.getescala.workforce.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "professional_emergency_contacts")
public class ProfessionalEmergencyContactJpaEntity {
  @Id
  @UuidGenerator
  private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "professional_id", nullable = false)
  private UUID professionalId;

  @Column(nullable = false)
  private String name;

  @Column(nullable = false)
  private String phone;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  protected ProfessionalEmergencyContactJpaEntity() {}

  public ProfessionalEmergencyContactJpaEntity(UUID tenantId, UUID professionalId, String name, String phone) {
    this.tenantId = tenantId;
    this.professionalId = professionalId;
    this.name = name;
    this.phone = phone;
  }

  public UUID getId() {
    return id;
  }

  public UUID getTenantId() {
    return tenantId;
  }

  public UUID getProfessionalId() {
    return professionalId;
  }

  public String getName() {
    return name;
  }

  public String getPhone() {
    return phone;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }
}
