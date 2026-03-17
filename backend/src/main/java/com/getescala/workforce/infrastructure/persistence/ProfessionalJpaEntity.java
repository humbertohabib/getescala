package com.getescala.workforce.infrastructure.persistence;

import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "professionals")
public class ProfessionalJpaEntity {
  @Id
  @UuidGenerator
  private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "full_name", nullable = false)
  private String fullName;

  @Column
  private String email;

  @Column
  private String phone;

  @Column(nullable = false)
  private String status;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  protected ProfessionalJpaEntity() {}

  public ProfessionalJpaEntity(UUID tenantId, String fullName, String email, String phone) {
    this.tenantId = tenantId;
    this.fullName = fullName;
    this.email = email;
    this.phone = phone;
    this.status = "ACTIVE";
  }

  public UUID getId() {
    return id;
  }

  public UUID getTenantId() {
    return tenantId;
  }

  public String getFullName() {
    return fullName;
  }

  public String getEmail() {
    return email;
  }

  public String getPhone() {
    return phone;
  }

  public String getStatus() {
    return status;
  }

  public void updateDetails(String fullName, String email, String phone) {
    this.fullName = fullName;
    this.email = email;
    this.phone = phone;
  }

  public void setStatus(String status) {
    this.status = status;
  }
}
