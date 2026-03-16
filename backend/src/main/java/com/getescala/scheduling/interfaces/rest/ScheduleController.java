package com.getescala.scheduling.interfaces.rest;

import com.getescala.scheduling.application.ScheduleService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/schedules")
public class ScheduleController {
  private final ScheduleService scheduleService;

  public ScheduleController(ScheduleService scheduleService) {
    this.scheduleService = scheduleService;
  }

  @GetMapping
  public ResponseEntity<List<ScheduleService.ScheduleDto>> list(
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
      @RequestParam(required = false) String locationId,
      @RequestParam(required = false) String sectorId
  ) {
    return ResponseEntity.ok(scheduleService.list(from, to, locationId, sectorId));
  }

  @PostMapping
  public ResponseEntity<ScheduleService.ScheduleDto> create(
      @RequestBody @Valid ScheduleService.CreateScheduleRequest request
  ) {
    return ResponseEntity.ok(scheduleService.create(request));
  }

  @PostMapping("/{id}/replicate-previous-month")
  public ResponseEntity<ScheduleService.ReplicateResult> replicatePreviousMonth(@PathVariable("id") String id) {
    return ResponseEntity.ok(scheduleService.replicatePreviousMonth(id));
  }

  @PostMapping("/{id}/request-confirmation")
  public ResponseEntity<ScheduleService.RequestConfirmationResult> requestConfirmation(
      Authentication authentication,
      @PathVariable("id") String id
  ) {
    UUID userId = currentUserId(authentication);
    return ResponseEntity.ok(scheduleService.requestConfirmation(id, userId));
  }

  @PostMapping("/{id}/publish")
  public ResponseEntity<ScheduleService.ScheduleDto> publish(@PathVariable("id") String id) {
    return ResponseEntity.ok(scheduleService.publish(id));
  }

  @PostMapping("/{id}/lock")
  public ResponseEntity<ScheduleService.ScheduleDto> lock(@PathVariable("id") String id) {
    return ResponseEntity.ok(scheduleService.lock(id));
  }

  private static UUID currentUserId(Authentication authentication) {
    if (!(authentication instanceof JwtAuthenticationToken jwtAuth)) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "unauthorized");
    }
    Jwt jwt = jwtAuth.getToken();
    try {
      return UUID.fromString(jwt.getSubject());
    } catch (Exception ex) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "unauthorized");
    }
  }
}
