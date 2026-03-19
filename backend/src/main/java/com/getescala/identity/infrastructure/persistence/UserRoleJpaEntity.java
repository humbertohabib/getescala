package com.getescala.identity.infrastructure.persistence;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_roles")
public class UserRoleJpaEntity {
  @EmbeddedId
  private UserRoleId id;

  protected UserRoleJpaEntity() {}

  public UserRoleJpaEntity(UserRoleId id) {
    this.id = id;
  }

  public UserRoleId getId() {
    return id;
  }
}
