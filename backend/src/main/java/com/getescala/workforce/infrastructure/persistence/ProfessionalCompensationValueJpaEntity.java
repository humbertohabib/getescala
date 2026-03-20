package com.getescala.workforce.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "professional_compensation_values")
public class ProfessionalCompensationValueJpaEntity {
  @Id
  @UuidGenerator
  private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "professional_id", nullable = false)
  private UUID professionalId;

  @Column(name = "period_start", nullable = false)
  private LocalDate periodStart;

  @Column(name = "period_end")
  private LocalDate periodEnd;

  @Column(nullable = false)
  private String unit;

  @Column(name = "value_cents", nullable = false)
  private Integer valueCents;

  @Column(nullable = false)
  private String currency;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  protected ProfessionalCompensationValueJpaEntity() {}

  public ProfessionalCompensationValueJpaEntity(
      UUID tenantId,
      UUID professionalId,
      LocalDate periodStart,
      LocalDate periodEnd,
      String unit,
      Integer valueCents,
      String currency
  ) {
    this.tenantId = tenantId;
    this.professionalId = professionalId;
    this.periodStart = periodStart;
    this.periodEnd = periodEnd;
    this.unit = unit;
    this.valueCents = valueCents;
    this.currency = currency;
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

  public LocalDate getPeriodStart() {
    return periodStart;
  }

  public LocalDate getPeriodEnd() {
    return periodEnd;
  }

  public String getUnit() {
    return unit;
  }

  public Integer getValueCents() {
    return valueCents;
  }

  public String getCurrency() {
    return currency;
  }
}

