package com.getescala.identity.infrastructure.persistence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRoleJpaRepository extends JpaRepository<UserRoleJpaEntity, UserRoleId> {
  @Query("""
      select r.code
      from UserRoleJpaEntity ur
      join RoleJpaEntity r on r.id = ur.id.roleId
      where ur.id.userId = :userId
        and r.tenantId = :tenantId
      """)
  List<String> findRoleCodesByTenantIdAndUserId(@Param("tenantId") UUID tenantId, @Param("userId") UUID userId);

  @Query("""
      select ur.id.userId
      from UserRoleJpaEntity ur
      where ur.id.roleId = :roleId
      """)
  List<UUID> findUserIdsByRoleId(@Param("roleId") UUID roleId);
}
