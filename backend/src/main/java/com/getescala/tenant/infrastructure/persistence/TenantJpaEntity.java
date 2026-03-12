package com.getescala.tenant.infrastructure.persistence;

import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "tenants")
public class TenantJpaEntity {
  @Id
  @UuidGenerator
  private UUID id;

  @Column(nullable = false)
  private String name;

  @Column(name = "institution_type")
  private String institutionType;

  @Column(name = "organization_type_id")
  private UUID organizationTypeId;

  @Column(name = "stripe_customer_id")
  private String stripeCustomerId;

  @Column(name = "stripe_subscription_id")
  private String stripeSubscriptionId;

  @Column(name = "stripe_subscription_status")
  private String stripeSubscriptionStatus;

  @Column(name = "stripe_seat_limit")
  private Integer stripeSeatLimit;

  @Column(name = "stripe_current_period_end")
  private OffsetDateTime stripeCurrentPeriodEnd;

  @Column(name = "stripe_cancel_at_period_end", nullable = false)
  private boolean stripeCancelAtPeriodEnd;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  protected TenantJpaEntity() {}

  public TenantJpaEntity(String name) {
    this.name = name;
  }

  public UUID getId() {
    return id;
  }

  public String getName() {
    return name;
  }

  public String getInstitutionType() {
    return institutionType;
  }

  public void setInstitutionType(String institutionType) {
    this.institutionType = institutionType;
  }

  public UUID getOrganizationTypeId() {
    return organizationTypeId;
  }

  public void setOrganizationTypeId(UUID organizationTypeId) {
    this.organizationTypeId = organizationTypeId;
  }

  public String getStripeCustomerId() {
    return stripeCustomerId;
  }

  public void setStripeCustomerId(String stripeCustomerId) {
    this.stripeCustomerId = stripeCustomerId;
  }

  public String getStripeSubscriptionId() {
    return stripeSubscriptionId;
  }

  public void setStripeSubscriptionId(String stripeSubscriptionId) {
    this.stripeSubscriptionId = stripeSubscriptionId;
  }

  public String getStripeSubscriptionStatus() {
    return stripeSubscriptionStatus;
  }

  public void setStripeSubscriptionStatus(String stripeSubscriptionStatus) {
    this.stripeSubscriptionStatus = stripeSubscriptionStatus;
  }

  public Integer getStripeSeatLimit() {
    return stripeSeatLimit;
  }

  public void setStripeSeatLimit(Integer stripeSeatLimit) {
    this.stripeSeatLimit = stripeSeatLimit;
  }

  public OffsetDateTime getStripeCurrentPeriodEnd() {
    return stripeCurrentPeriodEnd;
  }

  public void setStripeCurrentPeriodEnd(OffsetDateTime stripeCurrentPeriodEnd) {
    this.stripeCurrentPeriodEnd = stripeCurrentPeriodEnd;
  }

  public boolean isStripeCancelAtPeriodEnd() {
    return stripeCancelAtPeriodEnd;
  }

  public void setStripeCancelAtPeriodEnd(boolean stripeCancelAtPeriodEnd) {
    this.stripeCancelAtPeriodEnd = stripeCancelAtPeriodEnd;
  }
}
