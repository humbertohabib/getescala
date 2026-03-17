package com.getescala.workforce.interfaces.rest;

import com.getescala.identity.application.AuthService;
import com.getescala.workforce.infrastructure.persistence.ProfessionalInviteJpaEntity;
import com.getescala.workforce.infrastructure.persistence.ProfessionalInviteJpaRepository;
import com.getescala.workforce.infrastructure.persistence.ProfessionalJpaEntity;
import com.getescala.workforce.infrastructure.persistence.ProfessionalJpaRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/public/professional-invites")
public class ProfessionalInvitePublicController {
  private final ProfessionalInviteJpaRepository inviteRepository;
  private final ProfessionalJpaRepository professionalRepository;
  private final AuthService authService;

  public record InviteInfoResponse(
      String tenantId,
      String professionalId,
      String professionalName,
      String email,
      String status,
      String expiresAt
  ) {}

  public record AcceptInviteRequest(String token, String password) {}

  public ProfessionalInvitePublicController(
      ProfessionalInviteJpaRepository inviteRepository,
      ProfessionalJpaRepository professionalRepository,
      AuthService authService
  ) {
    this.inviteRepository = inviteRepository;
    this.professionalRepository = professionalRepository;
    this.authService = authService;
  }

  @GetMapping("/{token}")
  public InviteInfoResponse getInvite(@PathVariable String token) {
    ProfessionalInviteJpaEntity invite = resolveInvite(token);
    if (!"PENDING".equalsIgnoreCase(invite.getStatus()) || invite.getAcceptedAt() != null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "invite_not_found");
    }
    ProfessionalJpaEntity professional = professionalRepository.findByTenantIdAndId(invite.getTenantId(), invite.getProfessionalId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "professional_not_found"));
    return new InviteInfoResponse(
        invite.getTenantId().toString(),
        invite.getProfessionalId().toString(),
        professional.getFullName(),
        invite.getEmail(),
        invite.getStatus(),
        invite.getExpiresAt().toString()
    );
  }

  @PostMapping("/accept")
  public AuthService.AuthResponse acceptInvite(@RequestBody AcceptInviteRequest request) {
    if (request == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "request is required");
    }
    if (request.token() == null || request.token().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "token is required");
    }
    if (request.password() == null || request.password().length() < 6) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "password must have at least 6 characters");
    }

    ProfessionalInviteJpaEntity invite = resolveInvite(request.token());
    if ("ACCEPTED".equalsIgnoreCase(invite.getStatus()) || invite.getAcceptedAt() != null) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "invite_already_accepted");
    }

    AuthService.AuthResponse response = authService.acceptProfessionalInvite(invite.getTenantId(), invite.getEmail(), request.password());
    invite.markAccepted(OffsetDateTime.now(ZoneOffset.UTC));
    inviteRepository.save(invite);
    return response;
  }

  private ProfessionalInviteJpaEntity resolveInvite(String token) {
    String raw = token == null ? "" : token.trim();
    if (raw.isBlank()) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "invite_not_found");
    }
    String hash = sha256Hex(raw);
    ProfessionalInviteJpaEntity invite = inviteRepository.findByTokenHash(hash)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "invite_not_found"));

    if (invite.getExpiresAt() != null && invite.getExpiresAt().isBefore(OffsetDateTime.now(ZoneOffset.UTC))) {
      throw new ResponseStatusException(HttpStatus.GONE, "invite_expired");
    }
    return invite;
  }

  private static String sha256Hex(String value) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
      StringBuilder sb = new StringBuilder(hash.length * 2);
      for (byte b : hash) {
        sb.append(Character.forDigit((b >> 4) & 0xF, 16));
        sb.append(Character.forDigit((b) & 0xF, 16));
      }
      return sb.toString();
    } catch (Exception ex) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "token_hash_failed");
    }
  }
}
