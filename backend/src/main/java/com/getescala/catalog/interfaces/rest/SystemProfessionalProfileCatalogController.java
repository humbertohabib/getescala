package com.getescala.catalog.interfaces.rest;

import com.getescala.catalog.infrastructure.persistence.ProfessionalHiringTypeJpaEntity;
import com.getescala.catalog.infrastructure.persistence.ProfessionalHiringTypeJpaRepository;
import com.getescala.catalog.infrastructure.persistence.ProfessionalPrefixJpaEntity;
import com.getescala.catalog.infrastructure.persistence.ProfessionalPrefixJpaRepository;
import com.getescala.catalog.infrastructure.persistence.ProfessionalProfessionJpaEntity;
import com.getescala.catalog.infrastructure.persistence.ProfessionalProfessionJpaRepository;
import com.getescala.catalog.infrastructure.persistence.ProfessionalRegistrationTypeJpaEntity;
import com.getescala.catalog.infrastructure.persistence.ProfessionalRegistrationTypeJpaRepository;
import com.getescala.catalog.infrastructure.persistence.ProfessionalSpecialtyJpaEntity;
import com.getescala.catalog.infrastructure.persistence.ProfessionalSpecialtyJpaRepository;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/system/professional-profile-catalog")
public class SystemProfessionalProfileCatalogController {
  private final ProfessionalPrefixJpaRepository prefixRepository;
  private final ProfessionalProfessionJpaRepository professionRepository;
  private final ProfessionalRegistrationTypeJpaRepository registrationTypeRepository;
  private final ProfessionalHiringTypeJpaRepository hiringTypeRepository;
  private final ProfessionalSpecialtyJpaRepository specialtyRepository;

  public record CatalogItemResponse(String id, String name, int sortOrder) {}

  public record CatalogResponse(
      List<CatalogItemResponse> prefixes,
      List<CatalogItemResponse> professions,
      List<CatalogItemResponse> registrationTypes,
      List<CatalogItemResponse> hiringTypes,
      List<CatalogItemResponse> specialties
  ) {}

  public record CreateItemRequest(String organizationTypeId, String name, Integer sortOrder) {}

  public record UpdateItemRequest(String organizationTypeId, String name, Integer sortOrder) {}

  private enum Kind {
    PREFIXES("prefixes"),
    PROFESSIONS("professions"),
    REGISTRATION_TYPES("registration-types"),
    HIRING_TYPES("hiring-types"),
    SPECIALTIES("specialties");

    private final String value;

    Kind(String value) {
      this.value = value;
    }

    static Kind fromPath(String raw) {
      if (raw == null || raw.isBlank()) return null;
      for (Kind k : values()) {
        if (k.value.equals(raw)) return k;
      }
      return null;
    }
  }

  public SystemProfessionalProfileCatalogController(
      ProfessionalPrefixJpaRepository prefixRepository,
      ProfessionalProfessionJpaRepository professionRepository,
      ProfessionalRegistrationTypeJpaRepository registrationTypeRepository,
      ProfessionalHiringTypeJpaRepository hiringTypeRepository,
      ProfessionalSpecialtyJpaRepository specialtyRepository
  ) {
    this.prefixRepository = prefixRepository;
    this.professionRepository = professionRepository;
    this.registrationTypeRepository = registrationTypeRepository;
    this.hiringTypeRepository = hiringTypeRepository;
    this.specialtyRepository = specialtyRepository;
  }

  @GetMapping
  public CatalogResponse get(Authentication authentication, @RequestParam("organizationTypeId") String organizationTypeId) {
    Authz.requireRole(authentication, "SUPER_ADMIN");
    UUID orgTypeId = parseUuid(organizationTypeId, "organization_type_invalid");

    return new CatalogResponse(
        prefixRepository.findAllByOrganizationTypeIdOrderBySortOrderAscNameAsc(orgTypeId).stream().map(this::toItem).toList(),
        professionRepository.findAllByOrganizationTypeIdOrderBySortOrderAscNameAsc(orgTypeId).stream().map(this::toItem).toList(),
        registrationTypeRepository.findAllByOrganizationTypeIdOrderBySortOrderAscNameAsc(orgTypeId).stream().map(this::toItem).toList(),
        hiringTypeRepository.findAllByOrganizationTypeIdOrderBySortOrderAscNameAsc(orgTypeId).stream().map(this::toItem).toList(),
        specialtyRepository.findAllByOrganizationTypeIdOrderBySortOrderAscNameAsc(orgTypeId).stream().map(this::toItem).toList()
    );
  }

  @PostMapping("/{kind}")
  public CatalogItemResponse create(
      Authentication authentication,
      @PathVariable("kind") String kind,
      @RequestBody CreateItemRequest request
  ) {
    Authz.requireRole(authentication, "SUPER_ADMIN");
    Kind parsed = Kind.fromPath(kind);
    if (parsed == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_kind");
    if (request == null || request.organizationTypeId() == null || request.organizationTypeId().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "organization_type_required");
    }
    UUID orgTypeId = parseUuid(request.organizationTypeId(), "organization_type_invalid");

    String name = request.name();
    if (name == null || name.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name_required");
    int sortOrder = request.sortOrder() == null ? 0 : request.sortOrder();
    String cleanedName = name.trim();

    return switch (parsed) {
      case PREFIXES -> toItem(prefixRepository.save(new ProfessionalPrefixJpaEntity(null, orgTypeId, cleanedName, sortOrder)));
      case PROFESSIONS -> toItem(professionRepository.save(new ProfessionalProfessionJpaEntity(null, orgTypeId, cleanedName, sortOrder)));
      case REGISTRATION_TYPES -> toItem(registrationTypeRepository.save(new ProfessionalRegistrationTypeJpaEntity(null, orgTypeId, cleanedName, sortOrder)));
      case HIRING_TYPES -> toItem(hiringTypeRepository.save(new ProfessionalHiringTypeJpaEntity(null, orgTypeId, cleanedName, sortOrder)));
      case SPECIALTIES -> toItem(specialtyRepository.save(new ProfessionalSpecialtyJpaEntity(null, orgTypeId, cleanedName, sortOrder)));
    };
  }

  @PutMapping("/{kind}/{id}")
  public CatalogItemResponse update(
      Authentication authentication,
      @PathVariable("kind") String kind,
      @PathVariable("id") String id,
      @RequestBody UpdateItemRequest request
  ) {
    Authz.requireRole(authentication, "SUPER_ADMIN");
    Kind parsed = Kind.fromPath(kind);
    if (parsed == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_kind");
    UUID itemId = parseUuid(id, "invalid_id");

    if (request == null || request.organizationTypeId() == null || request.organizationTypeId().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "organization_type_required");
    }
    UUID orgTypeId = parseUuid(request.organizationTypeId(), "organization_type_invalid");

    String name = request.name();
    if (name == null || name.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name_required");
    int sortOrder = request.sortOrder() == null ? 0 : request.sortOrder();
    String cleanedName = name.trim();

    return switch (parsed) {
      case PREFIXES -> {
        ProfessionalPrefixJpaEntity entity = prefixRepository.findById(itemId)
            .filter(e -> orgTypeId.equals(e.getOrganizationTypeId()) && e.getTenantId() == null)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));
        entity.setName(cleanedName);
        entity.setSortOrder(sortOrder);
        yield toItem(prefixRepository.save(entity));
      }
      case PROFESSIONS -> {
        ProfessionalProfessionJpaEntity entity = professionRepository.findById(itemId)
            .filter(e -> orgTypeId.equals(e.getOrganizationTypeId()) && e.getTenantId() == null)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));
        entity.setName(cleanedName);
        entity.setSortOrder(sortOrder);
        yield toItem(professionRepository.save(entity));
      }
      case REGISTRATION_TYPES -> {
        ProfessionalRegistrationTypeJpaEntity entity = registrationTypeRepository.findById(itemId)
            .filter(e -> orgTypeId.equals(e.getOrganizationTypeId()) && e.getTenantId() == null)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));
        entity.setName(cleanedName);
        entity.setSortOrder(sortOrder);
        yield toItem(registrationTypeRepository.save(entity));
      }
      case HIRING_TYPES -> {
        ProfessionalHiringTypeJpaEntity entity = hiringTypeRepository.findById(itemId)
            .filter(e -> orgTypeId.equals(e.getOrganizationTypeId()) && e.getTenantId() == null)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));
        entity.setName(cleanedName);
        entity.setSortOrder(sortOrder);
        yield toItem(hiringTypeRepository.save(entity));
      }
      case SPECIALTIES -> {
        ProfessionalSpecialtyJpaEntity entity = specialtyRepository.findById(itemId)
            .filter(e -> orgTypeId.equals(e.getOrganizationTypeId()) && e.getTenantId() == null)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));
        entity.setName(cleanedName);
        entity.setSortOrder(sortOrder);
        yield toItem(specialtyRepository.save(entity));
      }
    };
  }

  @DeleteMapping("/{kind}/{id}")
  public void delete(
      Authentication authentication,
      @PathVariable("kind") String kind,
      @PathVariable("id") String id,
      @RequestParam("organizationTypeId") String organizationTypeId
  ) {
    Authz.requireRole(authentication, "SUPER_ADMIN");
    Kind parsed = Kind.fromPath(kind);
    if (parsed == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_kind");
    UUID itemId = parseUuid(id, "invalid_id");
    UUID orgTypeId = parseUuid(organizationTypeId, "organization_type_invalid");

    switch (parsed) {
      case PREFIXES -> {
        ProfessionalPrefixJpaEntity entity = prefixRepository.findById(itemId)
            .filter(e -> orgTypeId.equals(e.getOrganizationTypeId()) && e.getTenantId() == null)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));
        prefixRepository.delete(entity);
      }
      case PROFESSIONS -> {
        ProfessionalProfessionJpaEntity entity = professionRepository.findById(itemId)
            .filter(e -> orgTypeId.equals(e.getOrganizationTypeId()) && e.getTenantId() == null)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));
        professionRepository.delete(entity);
      }
      case REGISTRATION_TYPES -> {
        ProfessionalRegistrationTypeJpaEntity entity = registrationTypeRepository.findById(itemId)
            .filter(e -> orgTypeId.equals(e.getOrganizationTypeId()) && e.getTenantId() == null)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));
        registrationTypeRepository.delete(entity);
      }
      case HIRING_TYPES -> {
        ProfessionalHiringTypeJpaEntity entity = hiringTypeRepository.findById(itemId)
            .filter(e -> orgTypeId.equals(e.getOrganizationTypeId()) && e.getTenantId() == null)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));
        hiringTypeRepository.delete(entity);
      }
      case SPECIALTIES -> {
        ProfessionalSpecialtyJpaEntity entity = specialtyRepository.findById(itemId)
            .filter(e -> orgTypeId.equals(e.getOrganizationTypeId()) && e.getTenantId() == null)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));
        specialtyRepository.delete(entity);
      }
    }
  }

  private CatalogItemResponse toItem(ProfessionalPrefixJpaEntity entity) {
    return new CatalogItemResponse(entity.getId().toString(), entity.getName(), entity.getSortOrder());
  }

  private CatalogItemResponse toItem(ProfessionalProfessionJpaEntity entity) {
    return new CatalogItemResponse(entity.getId().toString(), entity.getName(), entity.getSortOrder());
  }

  private CatalogItemResponse toItem(ProfessionalRegistrationTypeJpaEntity entity) {
    return new CatalogItemResponse(entity.getId().toString(), entity.getName(), entity.getSortOrder());
  }

  private CatalogItemResponse toItem(ProfessionalHiringTypeJpaEntity entity) {
    return new CatalogItemResponse(entity.getId().toString(), entity.getName(), entity.getSortOrder());
  }

  private CatalogItemResponse toItem(ProfessionalSpecialtyJpaEntity entity) {
    return new CatalogItemResponse(entity.getId().toString(), entity.getName(), entity.getSortOrder());
  }

  private UUID parseUuid(String raw, String code) {
    try {
      return UUID.fromString(raw);
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, code);
    }
  }
}
