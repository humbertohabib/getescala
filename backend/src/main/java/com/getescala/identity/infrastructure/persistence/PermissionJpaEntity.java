package com.getescala.identity.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "permissions")
public class PermissionJpaEntity {
  @Id
  @UuidGenerator
  private UUID id;

  @Column(nullable = false)
  private String code;

  @Column(nullable = false)
  private String name;

  protected PermissionJpaEntity() {}

  public PermissionJpaEntity(String code, String name) {
    this.code = code;
    this.name = name;
  }

  public UUID getId() {
    return id;
  }

  public String getCode() {
    return code;
  }

  public String getName() {
    return name;
  }
}
