package com.getescala.scheduling.interfaces.rest;

import com.getescala.scheduling.infrastructure.persistence.LocationJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.LocationJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.ScheduleJpaRepository;
import com.getescala.scheduling.infrastructure.persistence.SectorJpaEntity;
import com.getescala.scheduling.infrastructure.persistence.SectorJpaRepository;
import com.getescala.security.Authz;
import com.getescala.tenant.TenantContext;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
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
@RequestMapping("/api/settings/locations")
public class LocationSettingsController {
  public record LocationSectorResponse(String id, String locationId, String code, String name, boolean enabled) {}

  public record LocationResponse(
      String id,
      String code,
      String name,
      boolean enabled,
      String cep,
      String street,
      String streetNumber,
      String complement,
      String neighborhood,
      String city,
      String state,
      String notes,
      BigDecimal latitude,
      BigDecimal longitude,
      String timeZone,
      List<LocationSectorResponse> sectors
  ) {}

  public record CreateSectorRequest(String code, String name) {}

  public record CreateLocationRequest(
      String code,
      String name,
      String cep,
      String street,
      String streetNumber,
      String complement,
      String neighborhood,
      String city,
      String state,
      String notes,
      BigDecimal latitude,
      BigDecimal longitude,
      String timeZone,
      List<CreateSectorRequest> sectors
  ) {}

  public record UpdateLocationRequest(
      String code,
      String name,
      String cep,
      String street,
      String streetNumber,
      String complement,
      String neighborhood,
      String city,
      String state,
      String notes,
      BigDecimal latitude,
      BigDecimal longitude,
      String timeZone
  ) {}

  public record ToggleEnabledRequest(boolean enabled) {}

  private final LocationJpaRepository locationRepository;
  private final SectorJpaRepository sectorRepository;
  private final ScheduleJpaRepository scheduleRepository;

  public LocationSettingsController(
      LocationJpaRepository locationRepository,
      SectorJpaRepository sectorRepository,
      ScheduleJpaRepository scheduleRepository
  ) {
    this.locationRepository = locationRepository;
    this.sectorRepository = sectorRepository;
    this.scheduleRepository = scheduleRepository;
  }

  @GetMapping
  public List<LocationResponse> list(Authentication authentication) {
    UUID tenantId = requireTenantId();
    List<LocationJpaEntity> locations = locationRepository.findByTenantIdOrderByNameAsc(tenantId);
    List<SectorJpaEntity> sectors = sectorRepository.findByTenantIdOrderByNameAsc(tenantId);

    Map<UUID, List<LocationSectorResponse>> sectorsByLocationId = new HashMap<>();
    for (SectorJpaEntity s : sectors) {
      UUID locId = s.getLocationId();
      if (locId == null) continue;
      sectorsByLocationId.computeIfAbsent(locId, k -> new ArrayList<>()).add(toSectorResponse(s));
    }

    return locations.stream()
        .map((l) -> toResponse(l, sectorsByLocationId.getOrDefault(l.getId(), List.of())))
        .toList();
  }

  @PostMapping
  @Transactional
  public LocationResponse create(Authentication authentication, @RequestBody CreateLocationRequest request) {
    Authz.requireRole(authentication, "ADMIN");
    UUID tenantId = requireTenantId();

    if (request == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_request");
    String name = normalizeRequiredText(request.name(), "name_required");
    String street = normalizeRequiredText(request.street(), "street_required");
    String streetNumber = normalizeRequiredText(request.streetNumber(), "street_number_required");
    String neighborhood = normalizeRequiredText(request.neighborhood(), "neighborhood_required");
    String city = normalizeRequiredText(request.city(), "city_required");
    String state = normalizeRequiredText(request.state(), "state_required");
    String timeZone = normalizeRequiredText(request.timeZone(), "time_zone_required");
    validateCoordinates(request.latitude(), request.longitude());

    List<CreateSectorRequest> sectors = request.sectors() == null ? List.of() : request.sectors();
    List<CreateSectorRequest> normalizedSectors = sectors.stream()
        .filter((s) -> s != null && s.name() != null && !s.name().isBlank())
        .toList();
    if (normalizedSectors.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sector_required");

    LocationJpaEntity entity = new LocationJpaEntity(tenantId, name);
    entity.setCode(normalizeOptionalText(request.code()));
    entity.setCep(normalizeOptionalText(request.cep()));
    entity.setStreet(street);
    entity.setStreetNumber(streetNumber);
    entity.setComplement(normalizeOptionalText(request.complement()));
    entity.setNeighborhood(neighborhood);
    entity.setCity(city);
    entity.setState(state);
    entity.setNotes(normalizeOptionalText(request.notes()));
    entity.setLatitude(request.latitude());
    entity.setLongitude(request.longitude());
    entity.setTimeZone(timeZone);
    entity.setEnabled(true);

    LocationJpaEntity saved;
    try {
      saved = locationRepository.save(entity);
    } catch (DataIntegrityViolationException ex) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "location_conflict");
    }

    List<SectorJpaEntity> sectorEntities = new ArrayList<>();
    for (CreateSectorRequest s : normalizedSectors) {
      String sectorName = normalizeRequiredText(s.name(), "sector_name_required");
      SectorJpaEntity sector = new SectorJpaEntity(tenantId, saved.getId(), sectorName);
      sector.setCode(normalizeOptionalText(s.code()));
      sector.setEnabled(true);
      sectorEntities.add(sector);
    }

    try {
      sectorRepository.saveAll(sectorEntities);
    } catch (DataIntegrityViolationException ex) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "sector_conflict");
    }

    List<LocationSectorResponse> savedSectors = sectorRepository
        .findByTenantIdAndLocationIdOrderByNameAsc(tenantId, saved.getId()).stream()
        .map(LocationSettingsController::toSectorResponse)
        .toList();
    return toResponse(saved, savedSectors);
  }

  @PutMapping("/{id}")
  public LocationResponse update(
      Authentication authentication,
      @PathVariable("id") String id,
      @RequestBody UpdateLocationRequest request
  ) {
    Authz.requireRole(authentication, "ADMIN");
    UUID tenantId = requireTenantId();
    UUID locationId = parseUuid(id, "invalid_id");

    if (request == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_request");
    String name = normalizeRequiredText(request.name(), "name_required");
    String street = normalizeRequiredText(request.street(), "street_required");
    String streetNumber = normalizeRequiredText(request.streetNumber(), "street_number_required");
    String neighborhood = normalizeRequiredText(request.neighborhood(), "neighborhood_required");
    String city = normalizeRequiredText(request.city(), "city_required");
    String state = normalizeRequiredText(request.state(), "state_required");
    String timeZone = normalizeRequiredText(request.timeZone(), "time_zone_required");
    validateCoordinates(request.latitude(), request.longitude());

    LocationJpaEntity entity = locationRepository.findByTenantIdAndId(tenantId, locationId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));

    entity.setName(name);
    entity.setCode(normalizeOptionalText(request.code()));
    entity.setCep(normalizeOptionalText(request.cep()));
    entity.setStreet(street);
    entity.setStreetNumber(streetNumber);
    entity.setComplement(normalizeOptionalText(request.complement()));
    entity.setNeighborhood(neighborhood);
    entity.setCity(city);
    entity.setState(state);
    entity.setNotes(normalizeOptionalText(request.notes()));
    entity.setLatitude(request.latitude());
    entity.setLongitude(request.longitude());
    entity.setTimeZone(timeZone);

    LocationJpaEntity saved;
    try {
      saved = locationRepository.save(entity);
    } catch (DataIntegrityViolationException ex) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "location_conflict");
    }

    List<LocationSectorResponse> sectors = sectorRepository.findByTenantIdAndLocationIdOrderByNameAsc(tenantId, saved.getId()).stream()
        .map(LocationSettingsController::toSectorResponse)
        .toList();
    return toResponse(saved, sectors);
  }

  @PutMapping("/{id}/enabled")
  public LocationResponse setEnabled(
      Authentication authentication,
      @PathVariable("id") String id,
      @RequestBody ToggleEnabledRequest request
  ) {
    Authz.requireRole(authentication, "ADMIN");
    UUID tenantId = requireTenantId();
    UUID locationId = parseUuid(id, "invalid_id");
    if (request == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_request");

    LocationJpaEntity entity = locationRepository.findByTenantIdAndId(tenantId, locationId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));
    entity.setEnabled(request.enabled());
    LocationJpaEntity saved = locationRepository.save(entity);

    List<LocationSectorResponse> sectors = sectorRepository.findByTenantIdAndLocationIdOrderByNameAsc(tenantId, saved.getId()).stream()
        .map(LocationSettingsController::toSectorResponse)
        .toList();
    return toResponse(saved, sectors);
  }

  @DeleteMapping("/{id}")
  public void delete(Authentication authentication, @PathVariable("id") String id) {
    Authz.requireRole(authentication, "ADMIN");
    UUID tenantId = requireTenantId();
    UUID locationId = parseUuid(id, "invalid_id");

    LocationJpaEntity entity = locationRepository.findByTenantIdAndId(tenantId, locationId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));

    long sectorsCount = sectorRepository.countByTenantIdAndLocationId(tenantId, locationId);
    if (sectorsCount > 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "location_has_sectors");

    long schedulesCount = scheduleRepository.countByTenantIdAndLocationId(tenantId, locationId);
    if (schedulesCount > 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "location_in_use");

    try {
      locationRepository.delete(entity);
    } catch (DataIntegrityViolationException ex) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "location_in_use");
    }
  }

  private static LocationResponse toResponse(LocationJpaEntity entity, List<LocationSectorResponse> sectors) {
    return new LocationResponse(
        entity.getId().toString(),
        entity.getCode(),
        entity.getName(),
        entity.isEnabled(),
        entity.getCep(),
        entity.getStreet(),
        entity.getStreetNumber(),
        entity.getComplement(),
        entity.getNeighborhood(),
        entity.getCity(),
        entity.getState(),
        entity.getNotes(),
        entity.getLatitude(),
        entity.getLongitude(),
        entity.getTimeZone(),
        sectors
    );
  }

  private static LocationSectorResponse toSectorResponse(SectorJpaEntity entity) {
    return new LocationSectorResponse(
        entity.getId().toString(),
        entity.getLocationId() == null ? null : entity.getLocationId().toString(),
        entity.getCode(),
        entity.getName(),
        entity.isEnabled()
    );
  }

  private UUID requireTenantId() {
    String raw = TenantContext.getTenantId();
    if (raw == null || raw.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenant_required");
    return parseUuid(raw, "tenant_invalid");
  }

  private static UUID parseUuid(String raw, String code) {
    try {
      return UUID.fromString(raw);
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, code);
    }
  }

  private static String normalizeRequiredText(String value, String code) {
    if (value == null || value.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, code);
    return value.trim();
  }

  private static String normalizeOptionalText(String value) {
    if (value == null) return null;
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private static void validateCoordinates(BigDecimal latitude, BigDecimal longitude) {
    if (latitude == null && longitude == null) return;
    if (latitude == null || longitude == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "coordinates_required");
    if (latitude.compareTo(BigDecimal.valueOf(-90)) < 0 || latitude.compareTo(BigDecimal.valueOf(90)) > 0) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "latitude_invalid");
    }
    if (longitude.compareTo(BigDecimal.valueOf(-180)) < 0 || longitude.compareTo(BigDecimal.valueOf(180)) > 0) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "longitude_invalid");
    }
  }
}
