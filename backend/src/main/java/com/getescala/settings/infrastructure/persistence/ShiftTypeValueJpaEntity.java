package com.getescala.settings.infrastructure.persistence;

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
@Table(name = "shift_type_values")
public class ShiftTypeValueJpaEntity {
  @Id
  @UuidGenerator
  private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "sector_id", nullable = false)
  private UUID sectorId;

  @Column(name = "period_start", nullable = false)
  private LocalDate periodStart;

  @Column(name = "period_end", nullable = false)
  private LocalDate periodEnd;

  @Column(name = "shift_type_code", nullable = false)
  private String shiftTypeCode;

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

  protected ShiftTypeValueJpaEntity() {}

  public ShiftTypeValueJpaEntity(
      UUID tenantId,
      UUID sectorId,
      LocalDate periodStart,
      LocalDate periodEnd,
      String shiftTypeCode,
      Integer valueCents,
      String currency
  ) {
    this.tenantId = tenantId;
    this.sectorId = sectorId;
    this.periodStart = periodStart;
    this.periodEnd = periodEnd;
    this.shiftTypeCode = shiftTypeCode;
    this.valueCents = valueCents;
    this.currency = currency;
  }

  public UUID getId() {
    return id;
  }

  public UUID getTenantId() {
    return tenantId;
  }

  public UUID getSectorId() {
    return sectorId;
  }

  public LocalDate getPeriodStart() {
    return periodStart;
  }

  public LocalDate getPeriodEnd() {
    return periodEnd;
  }

  public String getShiftTypeCode() {
    return shiftTypeCode;
  }

  public Integer getValueCents() {
    return valueCents;
  }

  public String getCurrency() {
    return currency;
  }
}

