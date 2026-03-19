package com.getescala.identity.infrastructure.persistence;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserScopeJpaRepository extends JpaRepository<UserScopeJpaEntity, UUID> {
  List<UserScopeJpaEntity> findByTenantIdAndUserIdIn(UUID tenantId, Collection<UUID> userIds);

  List<UserScopeJpaEntity> findByTenantIdAndUserId(UUID tenantId, UUID userId);

  boolean existsByTenantIdAndUserIdAndScopeTypeAndGroupId(UUID tenantId, UUID userId, String scopeType, UUID groupId);

  @Modifying
  @Query("""
      delete from UserScopeJpaEntity s
      where s.tenantId = :tenantId
        and s.userId in :userIds
        and s.scopeType = :scopeType
        and s.groupId = :groupId
      """)
  int deleteGroupScope(
      @Param("tenantId") UUID tenantId,
      @Param("userIds") Collection<UUID> userIds,
      @Param("scopeType") String scopeType,
      @Param("groupId") UUID groupId
  );
}
