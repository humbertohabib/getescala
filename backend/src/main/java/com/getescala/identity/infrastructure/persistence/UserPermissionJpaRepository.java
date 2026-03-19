package com.getescala.identity.infrastructure.persistence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface UserPermissionJpaRepository extends JpaRepository<UserPermissionJpaEntity, UserPermissionId> {
  @Query(
      value = """
          select p.code
          from user_permissions up
          join permissions p on p.id = up.permission_id
          join users u on u.id = up.user_id
          where u.tenant_id = :tenantId and up.user_id = :userId
          """,
      nativeQuery = true
  )
  List<String> findPermissionCodesByTenantIdAndUserId(@Param("tenantId") UUID tenantId, @Param("userId") UUID userId);

  @Modifying
  @Transactional
  @Query(value = "delete from user_permissions where user_id = :userId", nativeQuery = true)
  void deleteByUserId(@Param("userId") UUID userId);
}
