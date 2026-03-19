package com.getescala.identity.application;

import com.getescala.catalog.infrastructure.persistence.OrganizationTypeJpaEntity;
import com.getescala.catalog.infrastructure.persistence.OrganizationTypeJpaRepository;
import com.getescala.identity.infrastructure.persistence.RoleJpaEntity;
import com.getescala.identity.infrastructure.persistence.RoleJpaRepository;
import com.getescala.identity.infrastructure.persistence.UserJpaEntity;
import com.getescala.identity.infrastructure.persistence.UserJpaRepository;
import com.getescala.identity.infrastructure.persistence.UserPermissionJpaRepository;
import com.getescala.identity.infrastructure.persistence.UserRoleId;
import com.getescala.identity.infrastructure.persistence.UserRoleJpaEntity;
import com.getescala.identity.infrastructure.persistence.UserRoleJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.ScheduleJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.ScheduleJpaRepository;
import com.getescala.tenant.infrastructure.persistence.TenantJpaEntity;
import com.getescala.tenant.infrastructure.persistence.TenantJpaRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
  private static final Logger log = LoggerFactory.getLogger(AuthService.class);
  private static final String AUTH_PROVIDER_PASSWORD = "PASSWORD";
  private static final String AUTH_PROVIDER_GOOGLE = "GOOGLE";

  public record AuthResponse(
      String accessToken,
      String tokenType,
      String tenantId,
      String userId,
      String defaultScheduleId
  ) {}

  private final TenantJpaRepository tenantRepository;
  private final UserJpaRepository userRepository;
  private final RoleJpaRepository roleRepository;
  private final UserRoleJpaRepository userRoleRepository;
  private final UserPermissionJpaRepository userPermissionRepository;
  private final ScheduleJpaRepository scheduleRepository;
  private final OrganizationTypeJpaRepository organizationTypeRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtEncoder jwtEncoder;
  private final GoogleIdTokenVerifier googleIdTokenVerifier;
  private final Set<String> superAdminEmails;

  public AuthService(
      TenantJpaRepository tenantRepository,
      UserJpaRepository userRepository,
      RoleJpaRepository roleRepository,
      UserRoleJpaRepository userRoleRepository,
      UserPermissionJpaRepository userPermissionRepository,
      ScheduleJpaRepository scheduleRepository,
      OrganizationTypeJpaRepository organizationTypeRepository,
      PasswordEncoder passwordEncoder,
      JwtEncoder jwtEncoder,
      GoogleIdTokenVerifier googleIdTokenVerifier,
      @Value("${getescala.security.superAdminEmails:}") String superAdminEmailsCsv
  ) {
    this.tenantRepository = tenantRepository;
    this.userRepository = userRepository;
    this.roleRepository = roleRepository;
    this.userRoleRepository = userRoleRepository;
    this.userPermissionRepository = userPermissionRepository;
    this.scheduleRepository = scheduleRepository;
    this.organizationTypeRepository = organizationTypeRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtEncoder = jwtEncoder;
    this.googleIdTokenVerifier = googleIdTokenVerifier;
    this.superAdminEmails = parseEmails(superAdminEmailsCsv);
  }

  @Transactional
  public AuthResponse signUp(String tenantName, String organizationTypeId, String institutionType, String email, String password) {
    return signUpInternal(tenantName, organizationTypeId, institutionType, email, password, AUTH_PROVIDER_PASSWORD);
  }

  private AuthResponse signUpInternal(
      String tenantName,
      String organizationTypeId,
      String institutionType,
      String email,
      String password,
      String authProvider
  ) {
    if (tenantName == null || tenantName.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenantName is required");
    }

    String normalizedEmail = normalizeEmail(email);

    if (!userRepository.findByEmailOrderByCreatedAtAsc(normalizedEmail).isEmpty()) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe uma conta com este e-mail.");
    }

    String passwordHash;
    try {
      passwordHash = passwordEncoder.encode(password);
    } catch (Exception ex) {
      log.error("signUp failed at password_hash email={}", normalizedEmail, ex);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "signup_failed_password_hash");
    }

    OrganizationTypeJpaEntity resolvedType;
    try {
      resolvedType = resolveOrganizationType(organizationTypeId, institutionType);
    } catch (ResponseStatusException ex) {
      throw ex;
    } catch (Exception ex) {
      log.error("signUp failed at org_type_resolve email={}", normalizedEmail, ex);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "signup_failed_org_type_resolve");
    }
    TenantJpaEntity tenant = new TenantJpaEntity(tenantName.trim());
    tenant.setOrganizationTypeId(resolvedType.getId());
    tenant.setInstitutionType(resolvedType.getName());
    try {
      tenant = tenantRepository.saveAndFlush(tenant);
    } catch (Exception ex) {
      log.error("signUp failed at tenant_save email={}", normalizedEmail, ex);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "signup_failed_tenant_save");
    }

    UserJpaEntity user;
    try {
      user = userRepository.saveAndFlush(new UserJpaEntity(tenant.getId(), normalizedEmail, passwordHash, authProvider));
    } catch (Exception ex) {
      log.error("signUp failed at user_save tenantId={} email={}", tenant.getId(), normalizedEmail, ex);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "signup_failed_user_save");
    }

    try {
      ensureDefaultRolesForTenant(tenant.getId());
      assignRoleToUserIfMissing(tenant.getId(), user.getId(), "USER");
      assignRoleToUserIfMissing(tenant.getId(), user.getId(), "ADMIN");
    } catch (Exception ex) {
      log.error("signUp failed at role_assign tenantId={} userId={}", tenant.getId(), user.getId(), ex);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "signup_failed_role_assign");
    }

    ScheduleJpaEntity defaultSchedule;
    try {
      defaultSchedule = scheduleRepository.saveAndFlush(
          new ScheduleJpaEntity(tenant.getId(), currentMonthReferenceUtc())
      );
    } catch (Exception ex) {
      log.error("signUp failed at schedule_save tenantId={} email={}", tenant.getId(), normalizedEmail, ex);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "signup_failed_schedule_save");
    }

    String token;
    try {
      token = issueToken(
          tenant.getId(),
          user.getId(),
          rolesForUser(tenant.getId(), user.getId(), normalizedEmail),
          permissionsForUser(tenant.getId(), user.getId())
      );
    } catch (Exception ex) {
      log.error("signUp failed at token_issue tenantId={} userId={}", tenant.getId(), user.getId(), ex);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "signup_failed_token_issue");
    }

    return new AuthResponse(
        token,
        "Bearer",
        tenant.getId().toString(),
        user.getId().toString(),
        defaultSchedule.getId().toString()
    );
  }

  @Transactional
  public AuthResponse signIn(String tenantId, String email, String password) {
    String normalizedEmail = normalizeEmail(email);

    UserJpaEntity user;
    UUID tenantUuid;
    if (tenantId == null || tenantId.isBlank()) {
      List<UserJpaEntity> candidates = userRepository.findByEmailOrderByCreatedAtAsc(normalizedEmail);
      if (candidates.isEmpty()) {
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_credentials");
      }

      user = null;
      tenantUuid = null;
      for (UserJpaEntity candidate : candidates) {
        if (AUTH_PROVIDER_GOOGLE.equalsIgnoreCase(candidate.getAuthProvider())) {
          continue;
        }
        if (passwordEncoder.matches(password, candidate.getPasswordHash())) {
          user = candidate;
          tenantUuid = candidate.getTenantId();
          break;
        }
      }

      if (user == null || tenantUuid == null) {
        boolean googleOnly = candidates.stream().allMatch((c) -> AUTH_PROVIDER_GOOGLE.equalsIgnoreCase(c.getAuthProvider()));
        if (googleOnly) {
          throw new ResponseStatusException(
              HttpStatus.CONFLICT,
              "Esta conta foi criada com Google. Use \"Continuar com Google\" para entrar."
          );
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_credentials");
      }
    } else {
      tenantUuid = parseUuid(tenantId, "tenantId");
      user = userRepository.findByTenantIdAndEmail(tenantUuid, normalizedEmail)
          .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_credentials"));

      if (AUTH_PROVIDER_GOOGLE.equalsIgnoreCase(user.getAuthProvider())) {
        throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            "Esta conta foi criada com Google. Use \"Continuar com Google\" para entrar."
        );
      }

      if (!passwordEncoder.matches(password, user.getPasswordHash())) {
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_credentials");
      }
    }

    final UUID resolvedTenantUuid = tenantUuid;

    ScheduleJpaEntity schedule = scheduleRepository.findByTenantIdAndMonthReference(resolvedTenantUuid, currentMonthReferenceUtc())
        .orElseGet(() -> scheduleRepository.save(new ScheduleJpaEntity(resolvedTenantUuid, currentMonthReferenceUtc())));

    String scheduleId = schedule.getId().toString();
    String token = issueToken(
        resolvedTenantUuid,
        user.getId(),
        rolesForUser(resolvedTenantUuid, user.getId(), normalizedEmail),
        permissionsForUser(resolvedTenantUuid, user.getId())
    );

    return new AuthResponse(token, "Bearer", resolvedTenantUuid.toString(), user.getId().toString(), scheduleId);
  }

  @Transactional
  public AuthResponse googleSignIn(String tenantId, String idToken) {
    GoogleIdTokenVerifier.GoogleIdentity identity = googleIdTokenVerifier.verify(idToken);
    String email = normalizeEmail(identity.email());

    UserJpaEntity user;
    UUID tenantUuid;
    if (tenantId == null || tenantId.isBlank()) {
      List<UserJpaEntity> candidates = userRepository.findByEmailOrderByCreatedAtAsc(email);
      if (candidates.isEmpty()) {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "user_not_found");
      }
      user = candidates.getFirst();
      tenantUuid = user.getTenantId();
    } else {
      tenantUuid = parseUuid(tenantId, "tenantId");
      user = userRepository.findByTenantIdAndEmail(tenantUuid, email)
          .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user_not_found"));
    }

    ScheduleJpaEntity schedule = scheduleRepository.findByTenantIdAndMonthReference(tenantUuid, currentMonthReferenceUtc())
        .orElseGet(() -> scheduleRepository.save(new ScheduleJpaEntity(tenantUuid, currentMonthReferenceUtc())));

    String token = issueToken(
        tenantUuid,
        user.getId(),
        rolesForUser(tenantUuid, user.getId(), email),
        permissionsForUser(tenantUuid, user.getId())
    );
    return new AuthResponse(token, "Bearer", tenantUuid.toString(), user.getId().toString(), schedule.getId().toString());
  }

  @Transactional
  public AuthResponse googleSignUp(String tenantName, String organizationTypeId, String institutionType, String idToken) {
    GoogleIdTokenVerifier.GoogleIdentity identity = googleIdTokenVerifier.verify(idToken);
    String email = identity.email();
    return signUpInternal(tenantName, organizationTypeId, institutionType, email, UUID.randomUUID().toString(), AUTH_PROVIDER_GOOGLE);
  }

  @Transactional
  public AuthResponse acceptProfessionalInvite(UUID tenantId, String email, String password) {
    if (tenantId == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenantId is required");
    }
    String normalizedEmail = normalizeEmail(email);
    if (password == null || password.length() < 6) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "password must have at least 6 characters");
    }

    if (!userRepository.findByEmailOrderByCreatedAtAsc(normalizedEmail).isEmpty()) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe uma conta com este e-mail.");
    }

    String passwordHash;
    try {
      passwordHash = passwordEncoder.encode(password);
    } catch (Exception ex) {
      log.error("acceptInvite failed at password_hash tenantId={} email={}", tenantId, normalizedEmail, ex);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "invite_failed_password_hash");
    }

    UserJpaEntity user;
    try {
      user = userRepository.saveAndFlush(new UserJpaEntity(tenantId, normalizedEmail, passwordHash, AUTH_PROVIDER_PASSWORD));
    } catch (Exception ex) {
      log.error("acceptInvite failed at user_save tenantId={} email={}", tenantId, normalizedEmail, ex);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "invite_failed_user_save");
    }

    try {
      ensureDefaultRolesForTenant(tenantId);
      assignRoleToUserIfMissing(tenantId, user.getId(), "USER");
    } catch (Exception ex) {
      log.error("acceptInvite failed at role_assign tenantId={} userId={}", tenantId, user.getId(), ex);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "invite_failed_role_assign");
    }

    ScheduleJpaEntity schedule = scheduleRepository.findByTenantIdAndMonthReference(tenantId, currentMonthReferenceUtc())
        .orElseGet(() -> scheduleRepository.save(new ScheduleJpaEntity(tenantId, currentMonthReferenceUtc())));

    String token = issueToken(
        tenantId,
        user.getId(),
        rolesForUser(tenantId, user.getId(), normalizedEmail),
        permissionsForUser(tenantId, user.getId())
    );
    return new AuthResponse(token, "Bearer", tenantId.toString(), user.getId().toString(), schedule.getId().toString());
  }

  private OrganizationTypeJpaEntity resolveOrganizationType(String organizationTypeId, String institutionType) {
    if (organizationTypeId != null && !organizationTypeId.isBlank()) {
      UUID id = parseUuid(organizationTypeId, "organizationTypeId");
      return organizationTypeRepository.findById(id)
          .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "organizationTypeId is invalid"));
    }
    if (institutionType != null && !institutionType.isBlank()) {
      return organizationTypeRepository.findFirstByNameIgnoreCase(institutionType.trim())
          .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "institutionType is invalid"));
    }
    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "organizationTypeId is required");
  }

  private List<String> rolesForUser(UUID tenantId, UUID userId, String normalizedEmail) {
    List<String> roles = new ArrayList<>(userRoleRepository.findRoleCodesByTenantIdAndUserId(tenantId, userId));
    if (roles.isEmpty()) {
      roles.add("USER");
    }
    if (superAdminEmails.contains(normalizedEmail)) {
      if (!roles.contains("SUPER_ADMIN")) roles.add("SUPER_ADMIN");
    }
    return roles;
  }

  private List<String> permissionsForUser(UUID tenantId, UUID userId) {
    return new ArrayList<>(userPermissionRepository.findPermissionCodesByTenantIdAndUserId(tenantId, userId));
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

  private void assignRoleToUserIfMissing(UUID tenantId, UUID userId, String code) {
    RoleJpaEntity role = roleRepository.findByTenantIdAndCode(tenantId, code)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "role_missing"));
    UserRoleId id = new UserRoleId(userId, role.getId());
    if (userRoleRepository.existsById(id)) return;
    userRoleRepository.save(new UserRoleJpaEntity(id));
  }

  private String issueToken(UUID tenantId, UUID userId, List<String> roles, List<String> permissions) {
    Instant now = Instant.now();
    JwtClaimsSet claims = JwtClaimsSet.builder()
        .issuer("getescala")
        .issuedAt(now)
        .expiresAt(now.plusSeconds(60L * 60L * 8L))
        .subject(userId.toString())
        .claim("tenantId", tenantId.toString())
        .claim("roles", roles)
        .claim("permissions", permissions == null ? List.of() : permissions)
        .build();

    JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
    return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
  }

  private static UUID parseUuid(String value, String fieldName) {
    try {
      return UUID.fromString(value);
    } catch (Exception ex) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " is invalid");
    }
  }

  private static Set<String> parseEmails(String csv) {
    if (csv == null || csv.isBlank()) return Set.of();
    return Arrays.stream(csv.split(","))
        .map((value) -> value == null ? "" : value.trim().toLowerCase(Locale.ROOT))
        .filter((value) -> !value.isBlank())
        .collect(Collectors.toUnmodifiableSet());
  }

  private static String normalizeEmail(String email) {
    if (email == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email is required");
    }
    String value = email.trim().toLowerCase();
    if (value.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email is required");
    }
    return value;
  }

  private static LocalDate currentMonthReferenceUtc() {
    LocalDate today = LocalDate.now(ZoneOffset.UTC);
    return today.withDayOfMonth(1);
  }
}
