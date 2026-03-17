package com.getescala.scheduling.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "schedule_template_shifts")
public class ScheduleTemplateShiftJpaEntity {
  @Id
  @UuidGenerator
  private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(name = "template_id", nullable = false)
  private UUID templateId;

  @Column(name = "week_index", nullable = false)
  private int weekIndex;

  @Column(name = "day_of_week", nullable = false)
  private int dayOfWeek;

  @Column(name = "start_time", nullable = false)
  private LocalTime startTime;

  @Column(name = "end_time", nullable = false)
  private LocalTime endTime;

  @Column(name = "end_day_offset", nullable = false)
  private short endDayOffset;

  @Column(name = "kind", nullable = false)
  private String kind;

  @Column(name = "professional_id")
  private UUID professionalId;

  @Column(name = "value_cents")
  private Integer valueCents;

  @Column(name = "currency")
  private String currency;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  protected ScheduleTemplateShiftJpaEntity() {}

  public ScheduleTemplateShiftJpaEntity(
      UUID tenantId,
      UUID templateId,
      int weekIndex,
      int dayOfWeek,
      LocalTime startTime,
      LocalTime endTime,
      int endDayOffset,
      String kind,
      UUID professionalId,
      Integer valueCents,
      String currency
  ) {
    this.tenantId = tenantId;
    this.templateId = templateId;
    this.weekIndex = weekIndex;
    this.dayOfWeek = dayOfWeek;
    this.startTime = startTime;
    this.endTime = endTime;
    this.endDayOffset = (short) endDayOffset;
    this.kind = kind;
    this.professionalId = professionalId;
    this.valueCents = valueCents;
    this.currency = currency;
  }

  public UUID getId() {
    return id;
  }

  public UUID getTenantId() {
    return tenantId;
  }

  public UUID getTemplateId() {
    return templateId;
  }

  public int getWeekIndex() {
    return weekIndex;
  }

  public int getDayOfWeek() {
    return dayOfWeek;
  }

  public LocalTime getStartTime() {
    return startTime;
  }

  public LocalTime getEndTime() {
    return endTime;
  }

  public int getEndDayOffset() {
    return endDayOffset;
  }

  public String getKind() {
    return kind;
  }

  public UUID getProfessionalId() {
    return professionalId;
  }

  public Integer getValueCents() {
    return valueCents;
  }

  public String getCurrency() {
    return currency;
  }

  public void updateDetails(
      int weekIndex,
      int dayOfWeek,
      LocalTime startTime,
      LocalTime endTime,
      int endDayOffset,
      String kind,
      UUID professionalId,
      Integer valueCents,
      String currency
  ) {
    this.weekIndex = weekIndex;
    this.dayOfWeek = dayOfWeek;
    this.startTime = startTime;
    this.endTime = endTime;
    this.endDayOffset = (short) endDayOffset;
    this.kind = kind;
    this.professionalId = professionalId;
    this.valueCents = valueCents;
    this.currency = currency;
  }
}
