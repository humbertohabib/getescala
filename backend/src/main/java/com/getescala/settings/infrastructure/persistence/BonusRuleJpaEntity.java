package com.getescala.settings.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "bonus_rules")
public class BonusRuleJpaEntity {
  @Id
  @UuidGenerator
  private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(nullable = false)
  private String name;

  @Column(name = "value_kind", nullable = false)
  private String valueKind;

  @Column(name = "value_cents")
  private Integer valueCents;

  @Column(name = "value_bps")
  private Integer valueBps;

  @Column(name = "bonus_type", nullable = false)
  private String bonusType;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  protected BonusRuleJpaEntity() {}

  public BonusRuleJpaEntity(
      UUID tenantId,
      String name,
      String valueKind,
      Integer valueCents,
      Integer valueBps,
      String bonusType
  ) {
    this.tenantId = tenantId;
    this.name = name;
    this.valueKind = valueKind;
    this.valueCents = valueCents;
    this.valueBps = valueBps;
    this.bonusType = bonusType;
  }

  public UUID getId() {
    return id;
  }

  public UUID getTenantId() {
    return tenantId;
  }

  public String getName() {
    return name;
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

  public String getBonusType() {
    return bonusType;
  }

  public void updateDetails(
      String name,
      String valueKind,
      Integer valueCents,
      Integer valueBps,
      String bonusType
  ) {
    this.name = name;
    this.valueKind = valueKind;
    this.valueCents = valueCents;
    this.valueBps = valueBps;
    this.bonusType = bonusType;
  }
}
