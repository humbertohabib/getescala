package com.getescala.identity.interfaces.rest;

import com.getescala.identity.infrastructure.persistence.PermissionJpaEntity;
import com.getescala.identity.infrastructure.persistence.PermissionJpaRepository;
import com.getescala.identity.infrastructure.persistence.RoleJpaEntity;
import com.getescala.identity.infrastructure.persistence.RoleJpaRepository;
import com.getescala.identity.infrastructure.persistence.UserJpaEntity;
import com.getescala.identity.infrastructure.persistence.UserJpaRepository;
import com.getescala.identity.infrastructure.persistence.UserPermissionId;
import com.getescala.identity.infrastructure.persistence.UserPermissionJpaEntity;
import com.getescala.identity.infrastructure.persistence.UserPermissionJpaRepository;
import com.getescala.identity.infrastructure.persistence.UserRoleId;
import com.getescala.identity.infrastructure.persistence.UserRoleJpaEntity;
import com.getescala.identity.infrastructure.persistence.UserRoleJpaRepository;
import com.getescala.identity.infrastructure.persistence.UserScopeJpaEntity;
import com.getescala.identity.infrastructure.persistence.UserScopeJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.LocationJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.LocationJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.SectorJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.SectorJpaRepository;
import com.getescala.security.Authz;
import com.getescala.settings.infrastructure.persistence.GroupJpaEntity;
import com.getescala.settings.infrastructure.persistence.GroupJpaRepository;
import com.getescala.tenant.TenantContext;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/users/coordinators")
public class CoordinatorController {
  private static final String SCOPE_GROUP = "GROUP";

  private final UserJpaRepository userRepository;
  private final RoleJpaRepository roleRepository;
  private final UserRoleJpaRepository userRoleRepository;
  private final PermissionJpaRepository permissionRepository;
  private final UserPermissionJpaRepository userPermissionRepository;
  private final UserScopeJpaRepository userScopeRepository;
  private final GroupJpaRepository groupRepository;
  private final LocationJpaRepository locationRepository;
  private final SectorJpaRepository sectorRepository;
  private final PasswordEncoder passwordEncoder;

  public record ScopeTag(String id, String name) {}

  public record CoordinatorResponse(
      String id,
      String fullName,
      String email,
      List<ScopeTag> locations,
      List<ScopeTag> sectors,
      List<ScopeTag> groups
  ) {}

  public record CreateCoordinatorRequest(String fullName, String email, String password, List<String> permissions) {}

  public record BulkGroupScopeRequest(List<String> userIds, String groupId) {}

  public CoordinatorController(
      UserJpaRepository userRepository,
      RoleJpaRepository roleRepository,
      UserRoleJpaRepository userRoleRepository,
      PermissionJpaRepository permissionRepository,
      UserPermissionJpaRepository userPermissionRepository,
      UserScopeJpaRepository userScopeRepository,
      GroupJpaRepository groupRepository,
      LocationJpaRepository locationRepository,
      SectorJpaRepository sectorRepository,
      PasswordEncoder passwordEncoder
  ) {
    this.userRepository = userRepository;
    this.roleRepository = roleRepository;
    this.userRoleRepository = userRoleRepository;
    this.permissionRepository = permissionRepository;
    this.userPermissionRepository = userPermissionRepository;
    this.userScopeRepository = userScopeRepository;
    this.groupRepository = groupRepository;
    this.locationRepository = locationRepository;
    this.sectorRepository = sectorRepository;
    this.passwordEncoder = passwordEncoder;
  }

  @GetMapping
  public List<CoordinatorResponse> list(
      Authentication authentication,
      @RequestParam(name = "search", required = false) String search,
      @RequestParam(name = "groupId", required = false) String groupId
  ) {
    requireCanManageCoordinators(authentication);
    UUID tenantId = requireTenantId();

    Set<UUID> coordinatorUserIds = listUserIdsWithRole(tenantId, "COORDINATOR");
    if (coordinatorUserIds.isEmpty()) return List.of();

    Map<UUID, List<UserScopeJpaEntity>> scopesByUser = groupScopesByUser(tenantId, coordinatorUserIds);

    String q = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
    UUID groupUuid = groupId == null || groupId.isBlank() ? null : parseUuid(groupId, "invalid_group_id");

    List<UserJpaEntity> users = userRepository.findAllById(coordinatorUserIds);

    Map<UUID, String> locationNames = new HashMap<>();
    Map<UUID, String> sectorNames = new HashMap<>();
    Map<UUID, String> groupNames = new HashMap<>();
    hydrateScopeNames(tenantId, scopesByUser.values().stream().flatMap(Collection::stream).toList(), locationNames, sectorNames, groupNames);

    List<CoordinatorResponse> result = new ArrayList<>();
    for (UserJpaEntity u : users) {
      if (!tenantId.equals(u.getTenantId())) continue;
      String name = u.getFullName();
      String email = u.getEmail();
      String hay = ((name == null ? "" : name) + " " + (email == null ? "" : email)).toLowerCase(Locale.ROOT);
      if (!q.isBlank() && !hay.contains(q)) continue;

      List<UserScopeJpaEntity> scopes = scopesByUser.getOrDefault(u.getId(), List.of());
      List<ScopeTag> locations = new ArrayList<>();
      List<ScopeTag> sectors = new ArrayList<>();
      List<ScopeTag> groups = new ArrayList<>();
      boolean matchesGroup = groupUuid == null;
      for (UserScopeJpaEntity s : scopes) {
        if ("LOCATION".equalsIgnoreCase(s.getScopeType()) && s.getLocationId() != null) {
          String n = locationNames.getOrDefault(s.getLocationId(), s.getLocationId().toString());
          locations.add(new ScopeTag(s.getLocationId().toString(), n));
        } else if ("SECTOR".equalsIgnoreCase(s.getScopeType()) && s.getSectorId() != null) {
          String n = sectorNames.getOrDefault(s.getSectorId(), s.getSectorId().toString());
          sectors.add(new ScopeTag(s.getSectorId().toString(), n));
        } else if (SCOPE_GROUP.equalsIgnoreCase(s.getScopeType()) && s.getGroupId() != null) {
          String n = groupNames.getOrDefault(s.getGroupId(), s.getGroupId().toString());
          groups.add(new ScopeTag(s.getGroupId().toString(), n));
          if (groupUuid != null && groupUuid.equals(s.getGroupId())) matchesGroup = true;
        }
      }
      if (!matchesGroup) continue;

      result.add(new CoordinatorResponse(
          u.getId().toString(),
          name == null || name.isBlank() ? email : name,
          email,
          locations,
          sectors,
          groups
      ));
    }

    result.sort((a, b) -> a.fullName().compareToIgnoreCase(b.fullName()));
    return result;
  }

  @PostMapping
  @Transactional
  public CoordinatorResponse create(Authentication authentication, @RequestBody CreateCoordinatorRequest request) {
    requireCanManageCoordinators(authentication);
    UUID tenantId = requireTenantId();

    String email = request == null ? null : request.email();
    if (email == null || email.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email_required");
    String normalizedEmail = normalizeEmail(email);

    ensureDefaultRolesForTenant(tenantId);

    UserJpaEntity user = userRepository.findByTenantIdAndEmail(tenantId, normalizedEmail).orElse(null);
    if (user == null) {
      String password = request.password();
      if (password == null || password.length() < 6) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "password_too_short");
      String hash = passwordEncoder.encode(password);
      user = new UserJpaEntity(tenantId, normalizedEmail, hash, "PASSWORD");
      String fullName = request.fullName();
      if (fullName != null && !fullName.isBlank()) user.setFullName(fullName.trim());
      user = userRepository.save(user);
      assignRoleToUserIfMissing(tenantId, user.getId(), "USER");
    } else {
      String fullName = request.fullName();
      if (fullName != null && !fullName.isBlank()) {
        user.setFullName(fullName.trim());
        user = userRepository.save(user);
      }
    }

    assignRoleToUserIfMissing(tenantId, user.getId(), "COORDINATOR");

    List<String> requestedPermissionCodes = normalizePermissionCodes(request == null ? null : request.permissions());
    if (!requestedPermissionCodes.isEmpty()) {
      if (!Authz.hasRole(authentication, "SUPER_ADMIN") && !Authz.hasRole(authentication, "ADMIN")) {
        if (!Authz.hasRole(authentication, "COORDINATOR")) {
          throw new ResponseStatusException(HttpStatus.FORBIDDEN, "forbidden");
        }
        List<String> actorPermissions = Authz.permissions(authentication);
        for (String p : requestedPermissionCodes) {
          if (!actorPermissions.contains(p)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "forbidden");
          }
        }
      }
    }

    userPermissionRepository.deleteByUserId(user.getId());
    if (!requestedPermissionCodes.isEmpty()) {
      List<UserPermissionJpaEntity> toSave = new ArrayList<>(requestedPermissionCodes.size());
      for (String code : requestedPermissionCodes) {
        PermissionJpaEntity permission = permissionRepository.findByCode(code)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_permission"));
        toSave.add(new UserPermissionJpaEntity(new UserPermissionId(user.getId(), permission.getId())));
      }
      userPermissionRepository.saveAll(toSave);
    }

    Map<UUID, List<UserScopeJpaEntity>> scopesByUser = groupScopesByUser(tenantId, Set.of(user.getId()));
    Map<UUID, String> locationNames = new HashMap<>();
    Map<UUID, String> sectorNames = new HashMap<>();
    Map<UUID, String> groupNames = new HashMap<>();
    hydrateScopeNames(tenantId, scopesByUser.values().stream().flatMap(Collection::stream).toList(), locationNames, sectorNames, groupNames);

    List<UserScopeJpaEntity> scopes = scopesByUser.getOrDefault(user.getId(), List.of());
    List<ScopeTag> locations = new ArrayList<>();
    List<ScopeTag> sectors = new ArrayList<>();
    List<ScopeTag> groups = new ArrayList<>();
    for (UserScopeJpaEntity s : scopes) {
      if ("LOCATION".equalsIgnoreCase(s.getScopeType()) && s.getLocationId() != null) {
        locations.add(new ScopeTag(s.getLocationId().toString(), locationNames.getOrDefault(s.getLocationId(), s.getLocationId().toString())));
      } else if ("SECTOR".equalsIgnoreCase(s.getScopeType()) && s.getSectorId() != null) {
        sectors.add(new ScopeTag(s.getSectorId().toString(), sectorNames.getOrDefault(s.getSectorId(), s.getSectorId().toString())));
      } else if (SCOPE_GROUP.equalsIgnoreCase(s.getScopeType()) && s.getGroupId() != null) {
        groups.add(new ScopeTag(s.getGroupId().toString(), groupNames.getOrDefault(s.getGroupId(), s.getGroupId().toString())));
      }
    }

    return new CoordinatorResponse(
        user.getId().toString(),
        user.getFullName() == null || user.getFullName().isBlank() ? user.getEmail() : user.getFullName(),
        user.getEmail(),
        locations,
        sectors,
        groups
    );
  }

  @PostMapping("/groups:add")
  @Transactional
  public void addGroup(Authentication authentication, @RequestBody BulkGroupScopeRequest request) {
    requireCanManageCoordinators(authentication);
    UUID tenantId = requireTenantId();

    UUID groupId = parseUuid(request == null ? null : request.groupId(), "invalid_group_id");
    groupRepository.findByTenantIdAndId(tenantId, groupId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "group_not_found"));

    List<UUID> userIds = parseUuidList(request == null ? null : request.userIds(), "invalid_user_id");
    if (userIds.isEmpty()) return;

    Set<UUID> coordinatorUserIds = listUserIdsWithRole(tenantId, "COORDINATOR");
    for (UUID userId : userIds) {
      if (!coordinatorUserIds.contains(userId)) continue;
      if (userScopeRepository.existsByTenantIdAndUserIdAndScopeTypeAndGroupId(tenantId, userId, SCOPE_GROUP, groupId)) continue;
      userScopeRepository.save(new UserScopeJpaEntity(tenantId, userId, SCOPE_GROUP, null, null, groupId));
    }
  }

  @PostMapping("/groups:remove")
  @Transactional
  public void removeGroup(Authentication authentication, @RequestBody BulkGroupScopeRequest request) {
    requireCanManageCoordinators(authentication);
    UUID tenantId = requireTenantId();

    UUID groupId = parseUuid(request == null ? null : request.groupId(), "invalid_group_id");
    List<UUID> userIds = parseUuidList(request == null ? null : request.userIds(), "invalid_user_id");
    if (userIds.isEmpty()) return;
    userScopeRepository.deleteGroupScope(tenantId, userIds, SCOPE_GROUP, groupId);
  }

  private Set<UUID> listUserIdsWithRole(UUID tenantId, String code) {
    RoleJpaEntity role = roleRepository.findByTenantIdAndCode(tenantId, code).orElse(null);
    if (role == null) return Set.of();
    return userRoleRepository.findUserIdsByRoleId(role.getId()).stream().collect(Collectors.toUnmodifiableSet());
  }

  private Map<UUID, List<UserScopeJpaEntity>> groupScopesByUser(UUID tenantId, Set<UUID> userIds) {
    List<UserScopeJpaEntity> scopes = userScopeRepository.findByTenantIdAndUserIdIn(tenantId, userIds);
    Map<UUID, List<UserScopeJpaEntity>> grouped = new HashMap<>();
    for (UserScopeJpaEntity s : scopes) {
      grouped.computeIfAbsent(s.getUserId(), (k) -> new ArrayList<>()).add(s);
    }
    return grouped;
  }

  private void hydrateScopeNames(
      UUID tenantId,
      List<UserScopeJpaEntity> scopes,
      Map<UUID, String> locationNames,
      Map<UUID, String> sectorNames,
      Map<UUID, String> groupNames
  ) {
    Set<UUID> locationIds = scopes.stream().map(UserScopeJpaEntity::getLocationId).filter((v) -> v != null).collect(Collectors.toUnmodifiableSet());
    Set<UUID> sectorIds = scopes.stream().map(UserScopeJpaEntity::getSectorId).filter((v) -> v != null).collect(Collectors.toUnmodifiableSet());
    Set<UUID> groupIds = scopes.stream().map(UserScopeJpaEntity::getGroupId).filter((v) -> v != null).collect(Collectors.toUnmodifiableSet());

    if (!locationIds.isEmpty()) {
      for (LocationJpaEntity e : locationRepository.findAllById(locationIds)) {
        if (!tenantId.equals(e.getTenantId())) continue;
        locationNames.put(e.getId(), e.getName());
      }
    }
    if (!sectorIds.isEmpty()) {
      for (SectorJpaEntity e : sectorRepository.findAllById(sectorIds)) {
        if (!tenantId.equals(e.getTenantId())) continue;
        sectorNames.put(e.getId(), e.getName());
      }
    }
    if (!groupIds.isEmpty()) {
      for (GroupJpaEntity e : groupRepository.findAllById(groupIds)) {
        if (!tenantId.equals(e.getTenantId())) continue;
        groupNames.put(e.getId(), e.getName());
      }
    }
  }

  private void ensureDefaultRolesForTenant(UUID tenantId) {
    ensureRoleExists(tenantId, "USER", "Usuário");
    ensureRoleExists(tenantId, "ADMIN", "Administrador");
    ensureRoleExists(tenantId, "COORDINATOR", "Coordenador");
    ensureRoleExists(tenantId, "VIEWER", "Visualizador");
  }

  private void ensureRoleExists(UUID tenantId, String code, String name) {
    if (roleRepository.findByTenantIdAndCode(tenantId, code).isPresent()) return;
    roleRepository.save(new RoleJpaEntity(tenantId, code, name));
  }

  private void requireCanManageCoordinators(Authentication authentication) {
    if (Authz.hasRole(authentication, "SUPER_ADMIN") || Authz.hasRole(authentication, "ADMIN")) return;
    Authz.requireRole(authentication, "COORDINATOR");
    Authz.requirePermission(authentication, "MANAGE_COORDINATORS");
  }

  private static List<String> normalizePermissionCodes(List<String> raw) {
    if (raw == null || raw.isEmpty()) return List.of();
    List<String> result = new ArrayList<>();
    for (String item : raw) {
      if (item == null) continue;
      String code = item.trim().toUpperCase(Locale.ROOT);
      if (code.isBlank()) continue;
      code = code.replace(' ', '_');
      if (!result.contains(code)) result.add(code);
    }
    return result;
  }

  private void assignRoleToUserIfMissing(UUID tenantId, UUID userId, String code) {
    RoleJpaEntity role = roleRepository.findByTenantIdAndCode(tenantId, code)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "role_missing"));
    UserRoleId id = new UserRoleId(userId, role.getId());
    if (userRoleRepository.existsById(id)) return;
    userRoleRepository.save(new UserRoleJpaEntity(id));
  }

  private UUID requireTenantId() {
    String raw = TenantContext.getTenantId();
    if (raw == null || raw.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenant_required");
    return parseUuid(raw, "tenant_invalid");
  }

  private static UUID parseUuid(String raw, String code) {
    try {
      return UUID.fromString(raw);
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, code);
    }
  }

  private static List<UUID> parseUuidList(List<String> raw, String code) {
    if (raw == null || raw.isEmpty()) return List.of();
    List<UUID> result = new ArrayList<>();
    for (String value : raw) {
      result.add(parseUuid(value, code));
    }
    return result;
  }

  private static String normalizeEmail(String email) {
    if (email == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email_required");
    String value = email.trim().toLowerCase(Locale.ROOT);
    if (value.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email_required");
    return value;
  }
}
