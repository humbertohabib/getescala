package com.getescala.tenant.interfaces.rest;

import com.getescala.catalog.infrastructure.persistence.OrganizationTypeJpaEntity;
import com.getescala.catalog.infrastructure.persistence.OrganizationTypeJpaRepository;
import com.getescala.security.Authz;
import com.getescala.tenant.TenantContext;
import com.getescala.tenant.infrastructure.persistence.TenantJpaEntity;
import com.getescala.tenant.infrastructure.persistence.TenantJpaRepository;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/tenant")
public class TenantAdminController {
  private final TenantJpaRepository tenantRepository;
  private final OrganizationTypeJpaRepository organizationTypeRepository;

  public record TenantResponse(String id, String name, String organizationTypeId, String organizationTypeName, String userTerm, String shiftTerm) {}

  public record UpdateOrganizationTypeRequest(String organizationTypeId) {}

  public TenantAdminController(TenantJpaRepository tenantRepository, OrganizationTypeJpaRepository organizationTypeRepository) {
    this.tenantRepository = tenantRepository;
    this.organizationTypeRepository = organizationTypeRepository;
  }

  @GetMapping
  public TenantResponse get(Authentication authentication) {
    Authz.requireRole(authentication, "ADMIN");
    String tenantId = TenantContext.getTenantId();
    if (tenantId == null || tenantId.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenant_required");
    TenantJpaEntity tenant = tenantRepository.findById(UUID.fromString(tenantId))
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "tenant_not_found"));

    OrganizationTypeJpaEntity type = null;
    if (tenant.getOrganizationTypeId() != null) {
      type = organizationTypeRepository.findById(tenant.getOrganizationTypeId()).orElse(null);
    }

    return new TenantResponse(
        tenant.getId().toString(),
        tenant.getName(),
        tenant.getOrganizationTypeId() == null ? null : tenant.getOrganizationTypeId().toString(),
        type == null ? null : type.getName(),
        type == null ? null : type.getUserTerm(),
        type == null ? null : type.getShiftTerm()
    );
  }

  @PutMapping("/organization-type")
  public TenantResponse updateOrganizationType(Authentication authentication, @RequestBody UpdateOrganizationTypeRequest request) {
    Authz.requireRole(authentication, "ADMIN");
    if (request == null || request.organizationTypeId() == null || request.organizationTypeId().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "organization_type_required");
    }

    String tenantId = TenantContext.getTenantId();
    if (tenantId == null || tenantId.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenant_required");

    UUID organizationTypeId = UUID.fromString(request.organizationTypeId());
    OrganizationTypeJpaEntity type = organizationTypeRepository.findById(organizationTypeId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "organization_type_not_found"));

    TenantJpaEntity tenant = tenantRepository.findById(UUID.fromString(tenantId))
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "tenant_not_found"));

    tenant.setOrganizationTypeId(organizationTypeId);
    tenant.setInstitutionType(type.getName());
    tenantRepository.save(tenant);

    return new TenantResponse(
        tenant.getId().toString(),
        tenant.getName(),
        organizationTypeId.toString(),
        type.getName(),
        type.getUserTerm(),
        type.getShiftTerm()
    );
  }
}
