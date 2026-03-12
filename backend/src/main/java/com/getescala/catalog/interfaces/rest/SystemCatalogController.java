package com.getescala.catalog.interfaces.rest;

import com.getescala.catalog.infrastructure.persistence.OrganizationTypeJpaEntity;
import com.getescala.catalog.infrastructure.persistence.OrganizationTypeJpaRepository;
import com.getescala.catalog.infrastructure.persistence.SegmentJpaEntity;
import com.getescala.catalog.infrastructure.persistence.SegmentJpaRepository;
import com.getescala.security.Authz;
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
@RequestMapping("/api/system/catalog")
public class SystemCatalogController {
  private final SegmentJpaRepository segmentRepository;
  private final OrganizationTypeJpaRepository organizationTypeRepository;

  public record SegmentResponse(String id, String name) {}

  public record OrganizationTypeResponse(String id, String segmentId, String name, String userTerm, String shiftTerm) {}

  public record CreateSegmentRequest(String name) {}

  public record UpdateSegmentRequest(String name) {}

  public record CreateOrganizationTypeRequest(String segmentId, String name, String userTerm, String shiftTerm) {}

  public record UpdateOrganizationTypeRequest(String segmentId, String name, String userTerm, String shiftTerm) {}

  public SystemCatalogController(
      SegmentJpaRepository segmentRepository,
      OrganizationTypeJpaRepository organizationTypeRepository
  ) {
    this.segmentRepository = segmentRepository;
    this.organizationTypeRepository = organizationTypeRepository;
  }

  @GetMapping("/segments")
  public List<SegmentResponse> listSegments(Authentication authentication) {
    Authz.requireRole(authentication, "SUPER_ADMIN");
    return segmentRepository.findAll().stream().map(this::toSegmentResponse).toList();
  }

  @PostMapping("/segments")
  public SegmentResponse createSegment(Authentication authentication, @RequestBody CreateSegmentRequest request) {
    Authz.requireRole(authentication, "SUPER_ADMIN");
    if (request == null || request.name() == null || request.name().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name_required");
    }
    segmentRepository.findByNameIgnoreCase(request.name().trim()).ifPresent((existing) -> {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "segment_exists");
    });
    SegmentJpaEntity saved = segmentRepository.save(new SegmentJpaEntity(request.name().trim()));
    return toSegmentResponse(saved);
  }

  @PutMapping("/segments/{id}")
  public SegmentResponse updateSegment(
      Authentication authentication,
      @PathVariable("id") String id,
      @RequestBody UpdateSegmentRequest request
  ) {
    Authz.requireRole(authentication, "SUPER_ADMIN");
    if (request == null || request.name() == null || request.name().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name_required");
    }
    SegmentJpaEntity entity = segmentRepository.findById(UUID.fromString(id))
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "segment_not_found"));
    entity.setName(request.name().trim());
    SegmentJpaEntity saved = segmentRepository.save(entity);
    return toSegmentResponse(saved);
  }

  @DeleteMapping("/segments/{id}")
  public void deleteSegment(Authentication authentication, @PathVariable("id") String id) {
    Authz.requireRole(authentication, "SUPER_ADMIN");
    segmentRepository.deleteById(UUID.fromString(id));
  }

  @GetMapping("/organization-types")
  public List<OrganizationTypeResponse> listOrganizationTypes(Authentication authentication) {
    Authz.requireRole(authentication, "SUPER_ADMIN");
    return organizationTypeRepository.findAllByOrderByNameAsc().stream().map(this::toOrganizationTypeResponse).toList();
  }

  @PostMapping("/organization-types")
  public OrganizationTypeResponse createOrganizationType(Authentication authentication, @RequestBody CreateOrganizationTypeRequest request) {
    Authz.requireRole(authentication, "SUPER_ADMIN");
    validateOrganizationTypeRequest(request);
    UUID segmentId = UUID.fromString(request.segmentId());
    if (!segmentRepository.existsById(segmentId)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "segment_not_found");
    }
    OrganizationTypeJpaEntity saved = organizationTypeRepository.save(
        new OrganizationTypeJpaEntity(segmentId, request.name().trim(), request.userTerm().trim(), request.shiftTerm().trim())
    );
    return toOrganizationTypeResponse(saved);
  }

  @PutMapping("/organization-types/{id}")
  public OrganizationTypeResponse updateOrganizationType(
      Authentication authentication,
      @PathVariable("id") String id,
      @RequestBody UpdateOrganizationTypeRequest request
  ) {
    Authz.requireRole(authentication, "SUPER_ADMIN");
    validateOrganizationTypeRequest(request);
    OrganizationTypeJpaEntity entity = organizationTypeRepository.findById(UUID.fromString(id))
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "organization_type_not_found"));

    UUID segmentId = UUID.fromString(request.segmentId());
    if (!segmentRepository.existsById(segmentId)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "segment_not_found");
    }

    entity.setSegmentId(segmentId);
    entity.setName(request.name().trim());
    entity.setUserTerm(request.userTerm().trim());
    entity.setShiftTerm(request.shiftTerm().trim());
    OrganizationTypeJpaEntity saved = organizationTypeRepository.save(entity);
    return toOrganizationTypeResponse(saved);
  }

  @DeleteMapping("/organization-types/{id}")
  public void deleteOrganizationType(Authentication authentication, @PathVariable("id") String id) {
    Authz.requireRole(authentication, "SUPER_ADMIN");
    organizationTypeRepository.deleteById(UUID.fromString(id));
  }

  private void validateOrganizationTypeRequest(CreateOrganizationTypeRequest request) {
    if (request == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "body_required");
    if (request.segmentId() == null || request.segmentId().isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "segment_required");
    if (request.name() == null || request.name().isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name_required");
    if (request.userTerm() == null || request.userTerm().isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "user_term_required");
    if (request.shiftTerm() == null || request.shiftTerm().isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "shift_term_required");
  }

  private void validateOrganizationTypeRequest(UpdateOrganizationTypeRequest request) {
    if (request == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "body_required");
    if (request.segmentId() == null || request.segmentId().isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "segment_required");
    if (request.name() == null || request.name().isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name_required");
    if (request.userTerm() == null || request.userTerm().isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "user_term_required");
    if (request.shiftTerm() == null || request.shiftTerm().isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "shift_term_required");
  }

  private SegmentResponse toSegmentResponse(SegmentJpaEntity entity) {
    return new SegmentResponse(entity.getId().toString(), entity.getName());
  }

  private OrganizationTypeResponse toOrganizationTypeResponse(OrganizationTypeJpaEntity entity) {
    return new OrganizationTypeResponse(
        entity.getId().toString(),
        entity.getSegmentId().toString(),
        entity.getName(),
        entity.getUserTerm(),
        entity.getShiftTerm()
    );
  }
}
