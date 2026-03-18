package com.getescala.settings.interfaces.rest;

import com.getescala.security.Authz;
import com.getescala.settings.infrastructure.persistence.GroupJpaEntity;
import com.getescala.settings.infrastructure.persistence.GroupJpaRepository;
import com.getescala.tenant.TenantContext;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/groups")
public class GroupController {
  private final GroupJpaRepository groupRepository;

  public record GroupResponse(String id, String name) {}

  public record CreateGroupRequest(String name) {}

  public record UpdateGroupRequest(String name) {}

  public GroupController(GroupJpaRepository groupRepository) {
    this.groupRepository = groupRepository;
  }

  @GetMapping
  public List<GroupResponse> list(Authentication authentication) {
    Authz.requireAnyRole(authentication, "SUPER_ADMIN", "ADMIN");
    UUID tenantId = requireTenantId();
    return groupRepository.findByTenantIdOrderByNameAsc(tenantId).stream().map(GroupController::toResponse).toList();
  }

  @PostMapping
  public GroupResponse create(Authentication authentication, @RequestBody CreateGroupRequest request) {
    Authz.requireAnyRole(authentication, "SUPER_ADMIN", "ADMIN");
    UUID tenantId = requireTenantId();
    String name = request == null ? null : request.name();
    if (name == null || name.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name_required");
    GroupJpaEntity saved = groupRepository.save(new GroupJpaEntity(tenantId, name.trim()));
    return toResponse(saved);
  }

  @PutMapping("/{id}")
  public GroupResponse update(
      Authentication authentication,
      @PathVariable("id") String id,
      @RequestBody UpdateGroupRequest request
  ) {
    Authz.requireAnyRole(authentication, "SUPER_ADMIN", "ADMIN");
    UUID tenantId = requireTenantId();
    String name = request == null ? null : request.name();
    if (name == null || name.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name_required");
    UUID groupId = parseUuid(id, "invalid_id");
    GroupJpaEntity entity = groupRepository.findByTenantIdAndId(tenantId, groupId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));
    entity.setName(name.trim());
    GroupJpaEntity saved = groupRepository.save(entity);
    return toResponse(saved);
  }

  @DeleteMapping("/{id}")
  public void delete(Authentication authentication, @PathVariable("id") String id) {
    Authz.requireAnyRole(authentication, "SUPER_ADMIN", "ADMIN");
    UUID tenantId = requireTenantId();
    UUID groupId = parseUuid(id, "invalid_id");
    GroupJpaEntity entity = groupRepository.findByTenantIdAndId(tenantId, groupId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));
    groupRepository.delete(entity);
  }

  private static GroupResponse toResponse(GroupJpaEntity entity) {
    return new GroupResponse(entity.getId().toString(), entity.getName());
  }

  private UUID requireTenantId() {
    String raw = TenantContext.getTenantId();
    if (raw == null || raw.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenant_required");
    return parseUuid(raw, "tenant_invalid");
  }

  private UUID parseUuid(String raw, String code) {
    try {
      return UUID.fromString(raw);
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, code);
    }
  }
}
