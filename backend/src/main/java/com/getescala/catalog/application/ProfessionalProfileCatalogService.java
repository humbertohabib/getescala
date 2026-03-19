package com.getescala.catalog.application;

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
import com.getescala.tenant.TenantContext;
import com.getescala.tenant.infrastructure.persistence.TenantJpaEntity;
import com.getescala.tenant.infrastructure.persistence.TenantJpaRepository;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProfessionalProfileCatalogService {
  public record CatalogItem(String id, String name) {}

  public record ProfessionalProfileCatalogResponse(
      List<CatalogItem> prefixes,
      List<CatalogItem> professions,
      List<CatalogItem> registrationTypes,
      List<CatalogItem> hiringTypes,
      List<CatalogItem> specialties
  ) {}

  private final TenantJpaRepository tenantRepository;
  private final ProfessionalPrefixJpaRepository prefixRepository;
  private final ProfessionalProfessionJpaRepository professionRepository;
  private final ProfessionalRegistrationTypeJpaRepository registrationTypeRepository;
  private final ProfessionalHiringTypeJpaRepository hiringTypeRepository;
  private final ProfessionalSpecialtyJpaRepository specialtyRepository;

  public ProfessionalProfileCatalogService(
      TenantJpaRepository tenantRepository,
      ProfessionalPrefixJpaRepository prefixRepository,
      ProfessionalProfessionJpaRepository professionRepository,
      ProfessionalRegistrationTypeJpaRepository registrationTypeRepository,
      ProfessionalHiringTypeJpaRepository hiringTypeRepository,
      ProfessionalSpecialtyJpaRepository specialtyRepository
  ) {
    this.tenantRepository = tenantRepository;
    this.prefixRepository = prefixRepository;
    this.professionRepository = professionRepository;
    this.registrationTypeRepository = registrationTypeRepository;
    this.hiringTypeRepository = hiringTypeRepository;
    this.specialtyRepository = specialtyRepository;
  }

  @Transactional(readOnly = true)
  public ProfessionalProfileCatalogResponse getForCurrentTenant() {
    UUID tenantId = currentTenantId();
    UUID organizationTypeId = currentOrganizationTypeId(tenantId);

    List<ProfessionalPrefixJpaEntity> prefixes = resolveCatalog(
        tenantId,
        organizationTypeId,
        prefixRepository::findAllByTenantIdOrderBySortOrderAscNameAsc,
        prefixRepository::findAllByOrganizationTypeIdOrderBySortOrderAscNameAsc
    );
    List<ProfessionalProfessionJpaEntity> professions = resolveCatalog(
        tenantId,
        organizationTypeId,
        professionRepository::findAllByTenantIdOrderBySortOrderAscNameAsc,
        professionRepository::findAllByOrganizationTypeIdOrderBySortOrderAscNameAsc
    );
    List<ProfessionalRegistrationTypeJpaEntity> registrationTypes = resolveCatalog(
        tenantId,
        organizationTypeId,
        registrationTypeRepository::findAllByTenantIdOrderBySortOrderAscNameAsc,
        registrationTypeRepository::findAllByOrganizationTypeIdOrderBySortOrderAscNameAsc
    );
    List<ProfessionalHiringTypeJpaEntity> hiringTypes = resolveCatalog(
        tenantId,
        organizationTypeId,
        hiringTypeRepository::findAllByTenantIdOrderBySortOrderAscNameAsc,
        hiringTypeRepository::findAllByOrganizationTypeIdOrderBySortOrderAscNameAsc
    );
    List<ProfessionalSpecialtyJpaEntity> specialties = resolveCatalog(
        tenantId,
        organizationTypeId,
        specialtyRepository::findAllByTenantIdOrderBySortOrderAscNameAsc,
        specialtyRepository::findAllByOrganizationTypeIdOrderBySortOrderAscNameAsc
    );

    return new ProfessionalProfileCatalogResponse(
        prefixes.stream().map(this::toItem).toList(),
        professions.stream().map(this::toItem).toList(),
        registrationTypes.stream().map(this::toItem).toList(),
        hiringTypes.stream().map(this::toItem).toList(),
        specialties.stream().map(this::toItem).toList()
    );
  }

  @Transactional(readOnly = true)
  public void validateForCurrentTenant(String prefix, String profession, String registrationType, String specialties) {
    UUID tenantId = currentTenantId();
    UUID organizationTypeId = currentOrganizationTypeId(tenantId);

    if (prefix != null && !prefix.isBlank()) {
      Set<String> allowed = namesOf(resolveCatalog(
          tenantId,
          organizationTypeId,
          prefixRepository::findAllByTenantIdOrderBySortOrderAscNameAsc,
          prefixRepository::findAllByOrganizationTypeIdOrderBySortOrderAscNameAsc
      ));
      if (!allowed.contains(prefix)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "prefix_invalid");
    }

    if (profession != null && !profession.isBlank()) {
      Set<String> allowed = namesOf(resolveCatalog(
          tenantId,
          organizationTypeId,
          professionRepository::findAllByTenantIdOrderBySortOrderAscNameAsc,
          professionRepository::findAllByOrganizationTypeIdOrderBySortOrderAscNameAsc
      ));
      if (!allowed.contains(profession)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "profession_invalid");
    }

    if (registrationType != null && !registrationType.isBlank()) {
      Set<String> allowed = namesOf(resolveCatalog(
          tenantId,
          organizationTypeId,
          registrationTypeRepository::findAllByTenantIdOrderBySortOrderAscNameAsc,
          registrationTypeRepository::findAllByOrganizationTypeIdOrderBySortOrderAscNameAsc
      ));
      if (!allowed.contains(registrationType)) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "registration_type_invalid");
      }
    }

    if (specialties != null && !specialties.isBlank()) {
      Set<String> allowed = namesOf(resolveCatalog(
          tenantId,
          organizationTypeId,
          specialtyRepository::findAllByTenantIdOrderBySortOrderAscNameAsc,
          specialtyRepository::findAllByOrganizationTypeIdOrderBySortOrderAscNameAsc
      ));
      List<String> values = splitSpecialties(specialties);
      if (values.isEmpty()) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "specialties_invalid");
      }
      for (String value : values) {
        if (!allowed.contains(value)) {
          throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "specialties_invalid");
        }
      }
    }
  }

  @Transactional
  public void ensureDefaultsForCurrentTenant() {
    UUID tenantId = currentTenantId();
    UUID organizationTypeId = currentOrganizationTypeId(tenantId);
    if (organizationTypeId == null) return;

    List<ProfessionalPrefixJpaEntity> tenantPrefixes = prefixRepository.findAllByTenantIdOrderBySortOrderAscNameAsc(tenantId);
    Set<String> existingPrefixes = namesOf(tenantPrefixes);
    List<ProfessionalPrefixJpaEntity> defaultPrefixes =
        prefixRepository.findAllByOrganizationTypeIdOrderBySortOrderAscNameAsc(organizationTypeId);
    List<ProfessionalPrefixJpaEntity> prefixesToCreate = defaultPrefixes.stream()
        .filter((e) -> !existingPrefixes.contains(e.getName()))
        .map((e) -> new ProfessionalPrefixJpaEntity(tenantId, null, e.getName(), e.getSortOrder()))
        .toList();
    if (!prefixesToCreate.isEmpty()) {
      prefixRepository.saveAll(prefixesToCreate);
    }

    List<ProfessionalProfessionJpaEntity> tenantProfessions =
        professionRepository.findAllByTenantIdOrderBySortOrderAscNameAsc(tenantId);
    Set<String> existingProfessions = namesOf(tenantProfessions);
    List<ProfessionalProfessionJpaEntity> defaultProfessions =
        professionRepository.findAllByOrganizationTypeIdOrderBySortOrderAscNameAsc(organizationTypeId);
    List<ProfessionalProfessionJpaEntity> professionsToCreate = defaultProfessions.stream()
        .filter((e) -> !existingProfessions.contains(e.getName()))
        .map((e) -> new ProfessionalProfessionJpaEntity(tenantId, null, e.getName(), e.getSortOrder()))
        .toList();
    if (!professionsToCreate.isEmpty()) {
      professionRepository.saveAll(professionsToCreate);
    }

    List<ProfessionalRegistrationTypeJpaEntity> tenantRegistrationTypes =
        registrationTypeRepository.findAllByTenantIdOrderBySortOrderAscNameAsc(tenantId);
    Set<String> existingRegistrationTypes = namesOf(tenantRegistrationTypes);
    List<ProfessionalRegistrationTypeJpaEntity> defaultRegistrationTypes =
        registrationTypeRepository.findAllByOrganizationTypeIdOrderBySortOrderAscNameAsc(organizationTypeId);
    List<ProfessionalRegistrationTypeJpaEntity> registrationTypesToCreate = defaultRegistrationTypes.stream()
        .filter((e) -> !existingRegistrationTypes.contains(e.getName()))
        .map((e) -> new ProfessionalRegistrationTypeJpaEntity(tenantId, null, e.getName(), e.getSortOrder()))
        .toList();
    if (!registrationTypesToCreate.isEmpty()) {
      registrationTypeRepository.saveAll(registrationTypesToCreate);
    }

    List<ProfessionalHiringTypeJpaEntity> tenantHiringTypes =
        hiringTypeRepository.findAllByTenantIdOrderBySortOrderAscNameAsc(tenantId);
    Set<String> existingHiringTypes = namesOf(tenantHiringTypes);
    List<ProfessionalHiringTypeJpaEntity> defaultHiringTypes =
        hiringTypeRepository.findAllByOrganizationTypeIdOrderBySortOrderAscNameAsc(organizationTypeId);
    List<ProfessionalHiringTypeJpaEntity> hiringTypesToCreate = defaultHiringTypes.stream()
        .filter((e) -> !existingHiringTypes.contains(e.getName()))
        .map((e) -> new ProfessionalHiringTypeJpaEntity(tenantId, null, e.getName(), e.getSortOrder()))
        .toList();
    if (!hiringTypesToCreate.isEmpty()) {
      hiringTypeRepository.saveAll(hiringTypesToCreate);
    }

    List<ProfessionalSpecialtyJpaEntity> tenantSpecialties =
        specialtyRepository.findAllByTenantIdOrderBySortOrderAscNameAsc(tenantId);
    Set<String> existingSpecialties = namesOf(tenantSpecialties);
    List<ProfessionalSpecialtyJpaEntity> defaultSpecialties =
        specialtyRepository.findAllByOrganizationTypeIdOrderBySortOrderAscNameAsc(organizationTypeId);
    List<ProfessionalSpecialtyJpaEntity> specialtiesToCreate = defaultSpecialties.stream()
        .filter((e) -> !existingSpecialties.contains(e.getName()))
        .map((e) -> new ProfessionalSpecialtyJpaEntity(tenantId, null, e.getName(), e.getSortOrder()))
        .toList();
    if (!specialtiesToCreate.isEmpty()) {
      specialtyRepository.saveAll(specialtiesToCreate);
    }
  }

  private CatalogItem toItem(ProfessionalPrefixJpaEntity entity) {
    return new CatalogItem(entity.getId().toString(), entity.getName());
  }

  private CatalogItem toItem(ProfessionalProfessionJpaEntity entity) {
    return new CatalogItem(entity.getId().toString(), entity.getName());
  }

  private CatalogItem toItem(ProfessionalRegistrationTypeJpaEntity entity) {
    return new CatalogItem(entity.getId().toString(), entity.getName());
  }

  private CatalogItem toItem(ProfessionalHiringTypeJpaEntity entity) {
    return new CatalogItem(entity.getId().toString(), entity.getName());
  }

  private CatalogItem toItem(ProfessionalSpecialtyJpaEntity entity) {
    return new CatalogItem(entity.getId().toString(), entity.getName());
  }

  private interface FindTenant<T> {
    List<T> find(UUID tenantId);
  }

  private interface FindOrgType<T> {
    List<T> find(UUID organizationTypeId);
  }

  private static <T> List<T> resolveCatalog(
      UUID tenantId,
      UUID organizationTypeId,
      FindTenant<T> findTenant,
      FindOrgType<T> findOrgType
  ) {
    List<T> tenantCatalog = findTenant.find(tenantId);
    if (!tenantCatalog.isEmpty()) return tenantCatalog;
    if (organizationTypeId == null) return List.of();
    return findOrgType.find(organizationTypeId);
  }

  private static Set<String> namesOf(List<? extends Object> entities) {
    Set<String> set = new HashSet<>();
    for (Object obj : entities) {
      if (obj instanceof ProfessionalPrefixJpaEntity e) set.add(e.getName());
      else if (obj instanceof ProfessionalProfessionJpaEntity e) set.add(e.getName());
      else if (obj instanceof ProfessionalRegistrationTypeJpaEntity e) set.add(e.getName());
      else if (obj instanceof ProfessionalHiringTypeJpaEntity e) set.add(e.getName());
      else if (obj instanceof ProfessionalSpecialtyJpaEntity e) set.add(e.getName());
    }
    return set;
  }

  private static List<String> splitSpecialties(String value) {
    if (value == null) return List.of();
    String normalized = value.replace(';', ',');
    return Arrays.stream(normalized.split(","))
        .map(String::trim)
        .filter((s) -> !s.isBlank())
        .toList();
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

  private UUID currentOrganizationTypeId(UUID tenantId) {
    TenantJpaEntity tenant = tenantRepository.findById(tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenant_not_found"));
    return tenant.getOrganizationTypeId();
  }
}
