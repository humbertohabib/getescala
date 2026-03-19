package com.getescala.scheduling.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "locations")
public class LocationJpaEntity {
  @Id
  @UuidGenerator
  private UUID id;

  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(nullable = false)
  private String name;

  @Column
  private String code;

  @Column
  private String cep;

  @Column
  private String street;

  @Column(name = "street_number")
  private String streetNumber;

  @Column
  private String complement;

  @Column
  private String neighborhood;

  @Column
  private String city;

  @Column
  private String state;

  @Column
  private String notes;

  @Column(precision = 10, scale = 7)
  private BigDecimal latitude;

  @Column(precision = 10, scale = 7)
  private BigDecimal longitude;

  @Column(name = "time_zone")
  private String timeZone;

  @Column(nullable = false)
  private boolean enabled = true;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  protected LocationJpaEntity() {}

  public LocationJpaEntity(UUID tenantId, String name) {
    this.tenantId = tenantId;
    this.name = name;
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

  public String getCode() {
    return code;
  }

  public String getCep() {
    return cep;
  }

  public String getStreet() {
    return street;
  }

  public String getStreetNumber() {
    return streetNumber;
  }

  public String getComplement() {
    return complement;
  }

  public String getNeighborhood() {
    return neighborhood;
  }

  public String getCity() {
    return city;
  }

  public String getState() {
    return state;
  }

  public String getNotes() {
    return notes;
  }

  public BigDecimal getLatitude() {
    return latitude;
  }

  public BigDecimal getLongitude() {
    return longitude;
  }

  public String getTimeZone() {
    return timeZone;
  }

  public boolean isEnabled() {
    return enabled;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }

  public void setName(String name) {
    this.name = name;
  }

  public void setCode(String code) {
    this.code = code;
  }

  public void setCep(String cep) {
    this.cep = cep;
  }

  public void setStreet(String street) {
    this.street = street;
  }

  public void setStreetNumber(String streetNumber) {
    this.streetNumber = streetNumber;
  }

  public void setComplement(String complement) {
    this.complement = complement;
  }

  public void setNeighborhood(String neighborhood) {
    this.neighborhood = neighborhood;
  }

  public void setCity(String city) {
    this.city = city;
  }

  public void setState(String state) {
    this.state = state;
  }

  public void setNotes(String notes) {
    this.notes = notes;
  }

  public void setLatitude(BigDecimal latitude) {
    this.latitude = latitude;
  }

  public void setLongitude(BigDecimal longitude) {
    this.longitude = longitude;
  }

  public void setTimeZone(String timeZone) {
    this.timeZone = timeZone;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }
}
