package com.getescala.catalog.interfaces.rest;

import com.getescala.catalog.infrastructure.persistence.OrganizationTypeJpaEntity;
import com.getescala.catalog.infrastructure.persistence.OrganizationTypeJpaRepository;
import com.getescala.catalog.infrastructure.persistence.SegmentJpaEntity;
import com.getescala.catalog.infrastructure.persistence.SegmentJpaRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
public class PublicCatalogController {
  private final SegmentJpaRepository segmentRepository;
  private final OrganizationTypeJpaRepository organizationTypeRepository;

  public record SegmentResponse(String id, String name) {}

  public record OrganizationTypeResponse(String id, String segmentId, String name, String userTerm, String shiftTerm) {}

  public PublicCatalogController(
      SegmentJpaRepository segmentRepository,
      OrganizationTypeJpaRepository organizationTypeRepository
  ) {
    this.segmentRepository = segmentRepository;
    this.organizationTypeRepository = organizationTypeRepository;
  }

  @GetMapping("/segments")
  public List<SegmentResponse> listSegments() {
    return segmentRepository.findAll().stream().map(this::toSegmentResponse).toList();
  }

  @GetMapping("/organization-types")
  public List<OrganizationTypeResponse> listOrganizationTypes(@RequestParam(name = "segmentId", required = false) String segmentId) {
    List<OrganizationTypeJpaEntity> types;
    if (segmentId == null || segmentId.isBlank()) {
      types = organizationTypeRepository.findAllByOrderByNameAsc();
    } else {
      types = organizationTypeRepository.findAllBySegmentIdOrderByNameAsc(UUID.fromString(segmentId));
    }
    return types.stream().map(this::toOrganizationTypeResponse).toList();
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
