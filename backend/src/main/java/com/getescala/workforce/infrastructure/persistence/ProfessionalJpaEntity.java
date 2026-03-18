package com.getescala.workforce.infrastructure.persistence;

import java.time.OffsetDateTime;
import java.time.LocalDate;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;
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

  @Column(name = "birth_date")
  private LocalDate birthDate;

  @Column
  private String cpf;

  @Column
  private String prefix;

  @Column
  private String profession;

  @Column
  private String specialties;

  @Column
  private String department;

  @Column(name = "admission_date")
  private LocalDate admissionDate;

  @Column(name = "registration_type")
  private String registrationType;

  @Column(name = "professional_registration")
  private String professionalRegistration;

  @Column
  private String cep;

  @Column
  private String street;

  @Column(name = "address_number")
  private String addressNumber;

  @Column
  private String neighborhood;

  @Column
  private String complement;

  @Column(name = "state")
  private String state;

  @Column
  private String city;

  @Column
  private String country;

  @Column
  private String code;

  @Column
  private String notes;

  @Column
  private String details;

  @Column(name = "photo_file_name")
  private String photoFileName;

  @Column(name = "photo_content_type")
  private String photoContentType;

  @JdbcTypeCode(SqlTypes.BINARY)
  @Column(name = "photo_data")
  private byte[] photoData;

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

  public void updateProfileFields(
      LocalDate birthDate,
      String cpf,
      String prefix,
      String profession,
      String specialties,
      String department,
      LocalDate admissionDate,
      String registrationType,
      String professionalRegistration,
      String cep,
      String street,
      String addressNumber,
      String neighborhood,
      String complement,
      String state,
      String city,
      String country,
      String code,
      String notes,
      String details,
      String photoFileName,
      String photoContentType,
      byte[] photoData
  ) {
    this.birthDate = birthDate;
    this.cpf = cpf;
    this.prefix = prefix;
    this.profession = profession;
    this.specialties = specialties;
    this.department = department;
    this.admissionDate = admissionDate;
    this.registrationType = registrationType;
    this.professionalRegistration = professionalRegistration;
    this.cep = cep;
    this.street = street;
    this.addressNumber = addressNumber;
    this.neighborhood = neighborhood;
    this.complement = complement;
    this.state = state;
    this.city = city;
    this.country = country;
    this.code = code;
    this.notes = notes;
    this.details = details;
    this.photoFileName = photoFileName;
    this.photoContentType = photoContentType;
    this.photoData = photoData;
  }

  public void patchProfileFields(
      LocalDate birthDate,
      String cpf,
      String prefix,
      String profession,
      String specialties,
      String department,
      LocalDate admissionDate,
      String registrationType,
      String professionalRegistration,
      String cep,
      String street,
      String addressNumber,
      String neighborhood,
      String complement,
      String state,
      String city,
      String country,
      String code,
      String notes,
      String details,
      String photoFileName,
      String photoContentType,
      byte[] photoData
  ) {
    if (birthDate != null) this.birthDate = birthDate;
    if (cpf != null) this.cpf = cpf;
    if (prefix != null) this.prefix = prefix;
    if (profession != null) this.profession = profession;
    if (specialties != null) this.specialties = specialties;
    if (department != null) this.department = department;
    if (admissionDate != null) this.admissionDate = admissionDate;
    if (registrationType != null) this.registrationType = registrationType;
    if (professionalRegistration != null) this.professionalRegistration = professionalRegistration;
    if (cep != null) this.cep = cep;
    if (street != null) this.street = street;
    if (addressNumber != null) this.addressNumber = addressNumber;
    if (neighborhood != null) this.neighborhood = neighborhood;
    if (complement != null) this.complement = complement;
    if (state != null) this.state = state;
    if (city != null) this.city = city;
    if (country != null) this.country = country;
    if (code != null) this.code = code;
    if (notes != null) this.notes = notes;
    if (details != null) this.details = details;
    if (photoFileName != null) this.photoFileName = photoFileName;
    if (photoContentType != null) this.photoContentType = photoContentType;
    if (photoData != null) this.photoData = photoData;
  }

  public void setStatus(String status) {
    this.status = status;
  }
}
