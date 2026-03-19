package com.getescala.identity.infrastructure.persistence;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_permissions")
public class UserPermissionJpaEntity {
  @EmbeddedId
  private UserPermissionId id;

  protected UserPermissionJpaEntity() {}

  public UserPermissionJpaEntity(UserPermissionId id) {
    this.id = id;
  }

  public UserPermissionId getId() {
    return id;
  }
}
