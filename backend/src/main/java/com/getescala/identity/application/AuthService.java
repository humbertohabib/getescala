package com.getescala.identity.application;

import com.getescala.identity.infrastructure.persistence.UserJpaEntity;
import com.getescala.identity.infrastructure.persistence.UserJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.ScheduleJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.ScheduleJpaRepository;
import com.getescala.tenant.infrastructure.persistence.TenantJpaEntity;
import com.getescala.tenant.infrastructure.persistence.TenantJpaRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
  public record AuthResponse(
      String accessToken,
      String tokenType,
      String tenantId,
      String userId,
      String defaultScheduleId
  ) {}

  private final TenantJpaRepository tenantRepository;
  private final UserJpaRepository userRepository;
  private final ScheduleJpaRepository scheduleRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtEncoder jwtEncoder;

  public AuthService(
      TenantJpaRepository tenantRepository,
      UserJpaRepository userRepository,
      ScheduleJpaRepository scheduleRepository,
      PasswordEncoder passwordEncoder,
      JwtEncoder jwtEncoder
  ) {
    this.tenantRepository = tenantRepository;
    this.userRepository = userRepository;
    this.scheduleRepository = scheduleRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtEncoder = jwtEncoder;
  }

  @Transactional
  public AuthResponse signUp(String tenantName, String email, String password) {
    if (tenantName == null || tenantName.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenantName is required");
    }

    String normalizedEmail = normalizeEmail(email);
    String passwordHash = passwordEncoder.encode(password);

    TenantJpaEntity tenant = tenantRepository.save(new TenantJpaEntity(tenantName.trim()));
    UserJpaEntity user = userRepository.save(new UserJpaEntity(tenant.getId(), normalizedEmail, passwordHash));

    ScheduleJpaEntity defaultSchedule = scheduleRepository.save(
        new ScheduleJpaEntity(tenant.getId(), currentMonthReferenceUtc())
    );

    String token = issueToken(tenant.getId(), user.getId(), List.of("USER"));

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
        if (passwordEncoder.matches(password, candidate.getPasswordHash())) {
          user = candidate;
          tenantUuid = candidate.getTenantId();
          break;
        }
      }

      if (user == null || tenantUuid == null) {
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_credentials");
      }
    } else {
      tenantUuid = parseUuid(tenantId, "tenantId");
      user = userRepository.findByTenantIdAndEmail(tenantUuid, normalizedEmail)
          .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_credentials"));

      if (!passwordEncoder.matches(password, user.getPasswordHash())) {
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_credentials");
      }
    }

    final UUID resolvedTenantUuid = tenantUuid;

    ScheduleJpaEntity schedule = scheduleRepository.findByTenantIdAndMonthReference(resolvedTenantUuid, currentMonthReferenceUtc())
        .orElseGet(() -> scheduleRepository.save(new ScheduleJpaEntity(resolvedTenantUuid, currentMonthReferenceUtc())));

    String scheduleId = schedule.getId().toString();
    String token = issueToken(resolvedTenantUuid, user.getId(), List.of("USER"));

    return new AuthResponse(token, "Bearer", resolvedTenantUuid.toString(), user.getId().toString(), scheduleId);
  }

  private String issueToken(UUID tenantId, UUID userId, List<String> roles) {
    Instant now = Instant.now();
    JwtClaimsSet claims = JwtClaimsSet.builder()
        .issuer("getescala")
        .issuedAt(now)
        .expiresAt(now.plusSeconds(60L * 60L * 8L))
        .subject(userId.toString())
        .claim("tenantId", tenantId.toString())
        .claim("roles", roles)
        .build();

    return jwtEncoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
  }

  private static UUID parseUuid(String value, String fieldName) {
    try {
      return UUID.fromString(value);
    } catch (Exception ex) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " is invalid");
    }
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
