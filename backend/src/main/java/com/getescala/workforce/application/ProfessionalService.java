package com.getescala.workforce.application;

import com.getescala.tenant.TenantContext;
import com.getescala.tenant.infrastructure.persistence.TenantJpaEntity;
import com.getescala.tenant.infrastructure.persistence.TenantJpaRepository;
import com.getescala.workforce.infrastructure.persistence.ProfessionalJpaEntity;
import com.getescala.workforce.infrastructure.persistence.ProfessionalJpaRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProfessionalService {
  public record ProfessionalDto(String id, String fullName, String email, String phone, String status) {}

  public record CreateProfessionalRequest(String fullName, String email, String phone) {}

  private final ProfessionalJpaRepository professionalRepository;
  private final TenantJpaRepository tenantRepository;

  public ProfessionalService(ProfessionalJpaRepository professionalRepository, TenantJpaRepository tenantRepository) {
    this.professionalRepository = professionalRepository;
    this.tenantRepository = tenantRepository;
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
        blankToNull(request.email()),
        blankToNull(request.phone())
    );
    ProfessionalJpaEntity saved = professionalRepository.save(entity);
    return toDto(saved);
  }

  public boolean existsInTenant(UUID tenantId, UUID professionalId) {
    return professionalRepository.existsByTenantIdAndId(tenantId, professionalId);
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

  private static String blankToNull(String value) {
    if (value == null) return null;
    String trimmed = value.trim();
    return trimmed.isBlank() ? null : trimmed;
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
