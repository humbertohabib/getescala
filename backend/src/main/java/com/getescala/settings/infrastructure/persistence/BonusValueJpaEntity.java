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
@Table(name = "bonus_values")
public class BonusValueJpaEntity {
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

  @Column(name = "bonus_rule_id", nullable = false)
  private UUID bonusRuleId;

  @Column(name = "value_kind", nullable = false)
  private String valueKind;

  @Column(name = "value_cents")
  private Integer valueCents;

  @Column(name = "value_bps")
  private Integer valueBps;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  protected BonusValueJpaEntity() {}

  public BonusValueJpaEntity(
      UUID tenantId,
      UUID sectorId,
      LocalDate periodStart,
      LocalDate periodEnd,
      UUID bonusRuleId,
      String valueKind,
      Integer valueCents,
      Integer valueBps
  ) {
    this.tenantId = tenantId;
    this.sectorId = sectorId;
    this.periodStart = periodStart;
    this.periodEnd = periodEnd;
    this.bonusRuleId = bonusRuleId;
    this.valueKind = valueKind;
    this.valueCents = valueCents;
    this.valueBps = valueBps;
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

  public UUID getBonusRuleId() {
    return bonusRuleId;
  }

  public String getValueKind() {
    return valueKind;
  }

  public Integer getValueCents() {
    return valueCents;
  }

  public Integer getValueBps() {
    return valueBps;
  }
}

