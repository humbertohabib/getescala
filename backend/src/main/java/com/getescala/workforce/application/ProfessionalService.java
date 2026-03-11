package com.getescala.workforce.application;

import com.getescala.tenant.TenantContext;
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

  public ProfessionalService(ProfessionalJpaRepository professionalRepository) {
    this.professionalRepository = professionalRepository;
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
}
