package com.getescala.workforce.application;

import com.getescala.tenant.TenantContext;
import com.getescala.tenant.infrastructure.persistence.TenantJpaEntity;
import com.getescala.tenant.infrastructure.persistence.TenantJpaRepository;
import com.getescala.identity.infrastructure.persistence.UserJpaRepository;
import com.getescala.workforce.infrastructure.persistence.ProfessionalEmergencyContactJpaEntity;
import com.getescala.workforce.infrastructure.persistence.ProfessionalEmergencyContactJpaRepository;
import com.getescala.workforce.infrastructure.persistence.ProfessionalJpaEntity;
import com.getescala.workforce.infrastructure.persistence.ProfessionalJpaRepository;
import com.getescala.workforce.infrastructure.persistence.ProfessionalInviteJpaEntity;
import com.getescala.workforce.infrastructure.persistence.ProfessionalInviteJpaRepository;
import jakarta.mail.internet.MimeMessage;
import java.net.URLEncoder;
import java.time.LocalDate;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.Locale;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProfessionalService {
  private static final Logger log = LoggerFactory.getLogger(ProfessionalService.class);
  private static final SecureRandom secureRandom = new SecureRandom();

  public record ProfessionalDto(String id, String fullName, String email, String phone, String status) {}

  public record EmergencyContactRequest(String name, String phone) {}

  public record CreateProfessionalRequest(
      String fullName,
      String email,
      String phone,
      boolean sendInviteByEmail,
      LocalDate birthDate,
      String cpf,
      String prefix,
      String profession,
      String specialties,
      String department,
      LocalDate admissionDate,
      String registrationType,
      String professionalRegistration,
      String cep,
      String street,
      String addressNumber,
      String neighborhood,
      String complement,
      String state,
      String city,
      String country,
      String code,
      String notes,
      String details,
      String photoFileName,
      String photoDataUrl,
      List<EmergencyContactRequest> emergencyContacts
  ) {}

  public record UpdateProfessionalRequest(
      String fullName,
      String email,
      String phone,
      LocalDate birthDate,
      String cpf,
      String prefix,
      String profession,
      String specialties,
      String department,
      LocalDate admissionDate,
      String registrationType,
      String professionalRegistration,
      String cep,
      String street,
      String addressNumber,
      String neighborhood,
      String complement,
      String state,
      String city,
      String country,
      String code,
      String notes,
      String details,
      String photoFileName,
      String photoDataUrl,
      List<EmergencyContactRequest> emergencyContacts
  ) {}

  public record InviteResult(String email, String status, String expiresAt) {}

  private final ProfessionalJpaRepository professionalRepository;
  private final ProfessionalEmergencyContactJpaRepository emergencyContactRepository;
  private final TenantJpaRepository tenantRepository;
  private final UserJpaRepository userRepository;
  private final ProfessionalInviteJpaRepository professionalInviteRepository;
  private final ObjectProvider<JavaMailSender> mailSender;
  private final String appUrl;

  public ProfessionalService(
      ProfessionalJpaRepository professionalRepository,
      ProfessionalEmergencyContactJpaRepository emergencyContactRepository,
      TenantJpaRepository tenantRepository,
      UserJpaRepository userRepository,
      ProfessionalInviteJpaRepository professionalInviteRepository,
      ObjectProvider<JavaMailSender> mailSender,
      @Value("${getescala.billing.stripe.appUrl:http://localhost:5173}") String appUrl
  ) {
    this.professionalRepository = professionalRepository;
    this.emergencyContactRepository = emergencyContactRepository;
    this.tenantRepository = tenantRepository;
    this.userRepository = userRepository;
    this.professionalInviteRepository = professionalInviteRepository;
    this.mailSender = mailSender;
    this.appUrl = appUrl;
  }

  @Transactional(readOnly = true)
  public List<ProfessionalDto> list() {
    UUID tenantId = currentTenantId();
    return professionalRepository.findByTenantIdOrderByFullNameAsc(tenantId).stream()
        .map(ProfessionalService::toDto)
        .toList();
  }

  @Transactional
  public ProfessionalDto create(CreateProfessionalRequest request) {
    UUID tenantId = currentTenantId();
    if (request.fullName() == null || request.fullName().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fullName is required");
    }

    enforceSeatLimit(tenantId);

    ProfessionalJpaEntity entity = new ProfessionalJpaEntity(
        tenantId,
        request.fullName().trim(),
        normalizeEmailOrNull(request.email()),
        blankToNull(request.phone())
    );
    DecodedPhoto decodedPhoto = decodePhotoOrNull(request.photoDataUrl());
    entity.updateProfileFields(
        request.birthDate(),
        blankToNull(request.cpf()),
        blankToNull(request.prefix()),
        blankToNull(request.profession()),
        blankToNull(request.specialties()),
        blankToNull(request.department()),
        request.admissionDate(),
        blankToNull(request.registrationType()),
        blankToNull(request.professionalRegistration()),
        blankToNull(request.cep()),
        blankToNull(request.street()),
        blankToNull(request.addressNumber()),
        blankToNull(request.neighborhood()),
        blankToNull(request.complement()),
        blankToNull(request.state()),
        blankToNull(request.city()),
        blankToNull(request.country()),
        blankToNull(request.code()),
        blankToNull(request.notes()),
        blankToNull(request.details()),
        blankToNull(request.photoFileName()),
        decodedPhoto == null ? null : decodedPhoto.contentType(),
        decodedPhoto == null ? null : decodedPhoto.bytes()
    );

    ProfessionalJpaEntity saved = professionalRepository.save(entity);
    replaceEmergencyContacts(tenantId, saved.getId(), request.emergencyContacts());
    if (request.sendInviteByEmail() && saved.getEmail() != null && !saved.getEmail().isBlank()) {
      try {
        sendInviteInternal(saved, null, false);
      } catch (Exception ex) {
        log.warn("professional invite failed tenantId={} professionalId={}", tenantId, saved.getId(), ex);
      }
    }
    return toDto(saved);
  }

  @Transactional
  public ProfessionalDto update(String professionalId, UpdateProfessionalRequest request) {
    UUID tenantId = currentTenantId();
    UUID id = parseUuid(professionalId, "professionalId");
    if (request == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "request is required");
    }
    if (request.fullName() == null || request.fullName().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fullName is required");
    }

    ProfessionalJpaEntity entity = professionalRepository.findByTenantIdAndId(tenantId, id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "professional_not_found"));

    entity.updateDetails(
        request.fullName().trim(),
        normalizeEmailOrNull(request.email()),
        blankToNull(request.phone())
    );

    DecodedPhoto decodedPhoto = decodePhotoOrNull(request.photoDataUrl());
    entity.patchProfileFields(
        request.birthDate(),
        request.cpf() == null ? null : blankToNull(request.cpf()),
        request.prefix() == null ? null : blankToNull(request.prefix()),
        request.profession() == null ? null : blankToNull(request.profession()),
        request.specialties() == null ? null : blankToNull(request.specialties()),
        request.department() == null ? null : blankToNull(request.department()),
        request.admissionDate(),
        request.registrationType() == null ? null : blankToNull(request.registrationType()),
        request.professionalRegistration() == null ? null : blankToNull(request.professionalRegistration()),
        request.cep() == null ? null : blankToNull(request.cep()),
        request.street() == null ? null : blankToNull(request.street()),
        request.addressNumber() == null ? null : blankToNull(request.addressNumber()),
        request.neighborhood() == null ? null : blankToNull(request.neighborhood()),
        request.complement() == null ? null : blankToNull(request.complement()),
        request.state() == null ? null : blankToNull(request.state()),
        request.city() == null ? null : blankToNull(request.city()),
        request.country() == null ? null : blankToNull(request.country()),
        request.code() == null ? null : blankToNull(request.code()),
        request.notes() == null ? null : blankToNull(request.notes()),
        request.details() == null ? null : blankToNull(request.details()),
        request.photoFileName() == null ? null : blankToNull(request.photoFileName()),
        decodedPhoto == null ? null : decodedPhoto.contentType(),
        decodedPhoto == null ? null : decodedPhoto.bytes()
    );

    if (request.emergencyContacts() != null) {
      replaceEmergencyContacts(tenantId, entity.getId(), request.emergencyContacts());
    }
    ProfessionalJpaEntity saved = professionalRepository.save(entity);
    return toDto(saved);
  }

  private record DecodedPhoto(String contentType, byte[] bytes) {}

  private static DecodedPhoto decodePhotoOrNull(String value) {
    if (value == null || value.isBlank()) return null;
    String trimmed = value.trim();
    if (trimmed.startsWith("data:")) {
      int base64Index = trimmed.indexOf(";base64,");
      if (base64Index <= 5) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "photoDataUrl is invalid");
      }
      String contentType = trimmed.substring("data:".length(), base64Index).trim();
      String base64 = trimmed.substring(base64Index + ";base64,".length()).trim();
      if (base64.isBlank()) return null;
      try {
        return new DecodedPhoto(contentType.isBlank() ? null : contentType, Base64.getDecoder().decode(base64));
      } catch (IllegalArgumentException ex) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "photoDataUrl is invalid");
      }
    }
    try {
      return new DecodedPhoto(null, Base64.getDecoder().decode(trimmed));
    } catch (IllegalArgumentException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "photoDataUrl is invalid");
    }
  }

  private void replaceEmergencyContacts(UUID tenantId, UUID professionalId, List<EmergencyContactRequest> contacts) {
    if (contacts == null) return;
    emergencyContactRepository.deleteByTenantIdAndProfessionalId(tenantId, professionalId);
    if (contacts.isEmpty()) return;
    List<ProfessionalEmergencyContactJpaEntity> entities = contacts.stream()
        .map((c) -> {
          String name = c == null ? null : blankToNull(c.name());
          String phone = c == null ? null : blankToNull(c.phone());
          if (name == null && phone == null) return null;
          if (name == null || phone == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "emergencyContacts must contain name and phone");
          }
          return new ProfessionalEmergencyContactJpaEntity(tenantId, professionalId, name, phone);
        })
        .filter((e) -> e != null)
        .toList();
    if (!entities.isEmpty()) {
      emergencyContactRepository.saveAll(entities);
    }
  }

  @Transactional
  public ProfessionalDto deactivate(String professionalId) {
    UUID tenantId = currentTenantId();
    UUID id = parseUuid(professionalId, "professionalId");
    ProfessionalJpaEntity entity = professionalRepository.findByTenantIdAndId(tenantId, id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "professional_not_found"));

    entity.setStatus("INACTIVE");
    ProfessionalJpaEntity saved = professionalRepository.save(entity);
    return toDto(saved);
  }

  public boolean existsInTenant(UUID tenantId, UUID professionalId) {
    return professionalRepository.existsByTenantIdAndId(tenantId, professionalId);
  }

  @Transactional
  public InviteResult sendInvite(String professionalId, String actorUserId) {
    UUID tenantId = currentTenantId();
    UUID professionalUuid = parseUuid(professionalId, "professionalId");
    UUID actorUuid = actorUserId == null || actorUserId.isBlank() ? null : parseUuid(actorUserId, "userId");
    ProfessionalJpaEntity professional = professionalRepository.findByTenantIdAndId(tenantId, professionalUuid)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "professional_not_found"));
    if (professional.getEmail() == null || professional.getEmail().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "professional_email_required");
    }
    return sendInviteInternal(professional, actorUuid, true);
  }

  private static ProfessionalDto toDto(ProfessionalJpaEntity entity) {
    return new ProfessionalDto(
        entity.getId().toString(),
        entity.getFullName(),
        entity.getEmail(),
        entity.getPhone(),
        entity.getStatus()
    );
  }

  private static UUID currentTenantId() {
    String tenantId = TenantContext.getTenantId();
    if (tenantId == null || tenantId.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenant_required");
    }
    try {
      return UUID.fromString(tenantId);
    } catch (Exception ex) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenantId is invalid");
    }
  }

  private static UUID parseUuid(String value, String fieldName) {
    if (value == null || value.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " is required");
    }
    try {
      return UUID.fromString(value);
    } catch (Exception ex) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " is invalid");
    }
  }

  private static String blankToNull(String value) {
    if (value == null) return null;
    String trimmed = value.trim();
    return trimmed.isBlank() ? null : trimmed;
  }

  private static String normalizeEmailOrNull(String value) {
    if (value == null) return null;
    String trimmed = value.trim().toLowerCase(Locale.ROOT);
    return trimmed.isBlank() ? null : trimmed;
  }

  private InviteResult sendInviteInternal(ProfessionalJpaEntity professional, UUID actorUserId, boolean failIfAlreadyRegistered) {
    UUID tenantId = professional.getTenantId();
    String normalizedEmail = normalizeEmailOrNull(professional.getEmail());
    if (normalizedEmail == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "professional_email_required");
    }

    if (!userRepository.findByEmailOrderByCreatedAtAsc(normalizedEmail).isEmpty()) {
      if (failIfAlreadyRegistered) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "user_already_registered");
      }
      return new InviteResult(normalizedEmail, "SKIPPED_ALREADY_REGISTERED", null);
    }

    String token = generateToken();
    String tokenHash = sha256Hex(token);
    OffsetDateTime expiresAt = OffsetDateTime.now(ZoneOffset.UTC).plusDays(7);
    professionalInviteRepository.saveAndFlush(
        new ProfessionalInviteJpaEntity(tenantId, professional.getId(), normalizedEmail, tokenHash, expiresAt, actorUserId)
    );

    String inviteUrl = appUrl + "/login?invite=" + URLEncoder.encode(token, StandardCharsets.UTF_8);
    TenantJpaEntity tenant = tenantRepository.findById(tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenant_not_found"));

    String subject = "Convite para acessar o GetEscala";
    String html = """
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height:1.5">
          <h2 style="margin:0 0 12px">Você foi convidado para acessar o GetEscala</h2>
          <p style="margin:0 0 12px">Organização: <strong>%s</strong></p>
          <p style="margin:0 0 12px">Para concluir seu cadastro, clique no botão abaixo:</p>
          <p style="margin:18px 0">
            <a href="%s" style="display:inline-block;padding:12px 16px;border-radius:10px;background:#646cff;color:#fff;text-decoration:none;font-weight:700">Aceitar convite</a>
          </p>
          <p style="margin:0;opacity:.75;font-size:13px">Se você não esperava este e-mail, pode ignorá-lo.</p>
        </div>
        """.formatted(escapeHtml(tenant.getName()), inviteUrl);

    try {
      JavaMailSender sender = mailSender.getIfAvailable();
      if (sender == null) {
        log.warn("mail sender not configured; invite created but not emailed tenantId={} professionalId={} email={}", tenantId, professional.getId(), normalizedEmail);
        return new InviteResult(normalizedEmail, "QUEUED", expiresAt.toString());
      }
      MimeMessage message = sender.createMimeMessage();
      MimeMessageHelper helper = new MimeMessageHelper(message, StandardCharsets.UTF_8.name());
      helper.setTo(normalizedEmail);
      helper.setSubject(subject);
      helper.setText(html, true);
      sender.send(message);
      return new InviteResult(normalizedEmail, "SENT", expiresAt.toString());
    } catch (Exception ex) {
      log.error("sendInvite failed tenantId={} professionalId={} email={}", tenantId, professional.getId(), normalizedEmail, ex);
      return new InviteResult(normalizedEmail, "QUEUED", expiresAt.toString());
    }
  }

  private static String generateToken() {
    byte[] bytes = new byte[32];
    secureRandom.nextBytes(bytes);
    StringBuilder sb = new StringBuilder(bytes.length * 2);
    for (byte b : bytes) {
      sb.append(Character.forDigit((b >> 4) & 0xF, 16));
      sb.append(Character.forDigit((b) & 0xF, 16));
    }
    return sb.toString();
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

  private static String escapeHtml(String value) {
    if (value == null) return "";
    return value
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&#39;");
  }

  private void enforceSeatLimit(UUID tenantId) {
    TenantJpaEntity tenant = tenantRepository.findById(tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenant_not_found"));

    String status = tenant.getStripeSubscriptionStatus();
    if (status == null || status.isBlank()) {
      throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, "subscription_required");
    }
    if (!"active".equals(status) && !"trialing".equals(status)) {
      throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, "subscription_inactive");
    }

    Integer seatLimit = tenant.getStripeSeatLimit();
    if (seatLimit == null || seatLimit <= 0) {
      throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, "seat_limit_required");
    }

    long currentCount = professionalRepository.countByTenantId(tenantId);
    if (currentCount >= seatLimit.longValue()) {
      throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, "seat_limit_exceeded");
    }
  }
}
