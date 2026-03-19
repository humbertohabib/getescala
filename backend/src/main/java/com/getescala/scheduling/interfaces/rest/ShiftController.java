package com.getescala.scheduling.interfaces.rest;

import com.getescala.scheduling.application.ShiftService;
import com.getescala.security.Authz;
import jakarta.validation.Valid;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/shifts")
public class ShiftController {
  private final ShiftService shiftService;

  public ShiftController(ShiftService shiftService) {
    this.shiftService = shiftService;
  }

  @GetMapping
  public ResponseEntity<List<ShiftService.ShiftDto>> list(
      @RequestParam(name = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
      @RequestParam(name = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to,
      @RequestParam(name = "scheduleId", required = false) String scheduleId,
      @RequestParam(name = "professionalId", required = false) String professionalId,
      @RequestParam(name = "kind", required = false) String kind
  ) {
    return ResponseEntity.ok(shiftService.list(from, to, scheduleId, professionalId, kind));
  }

  @PostMapping
  public ResponseEntity<ShiftService.ShiftDto> create(Authentication authentication, @RequestBody @Valid ShiftService.CreateShiftRequest request) {
    if (!Authz.hasRole(authentication, "SUPER_ADMIN") && !Authz.hasRole(authentication, "ADMIN")) {
      Authz.requireRole(authentication, "COORDINATOR");
      Authz.requirePermission(authentication, "MANAGE_SHIFTS");
      if (request != null && (request.valueCents() != null || request.currency() != null)) {
        Authz.requirePermission(authentication, "MANAGE_SHIFT_VALUE");
      }
    }
    return ResponseEntity.ok(shiftService.create(request));
  }

  @PatchMapping("/{id}")
  public ResponseEntity<ShiftService.ShiftDto> update(
      Authentication authentication,
      @PathVariable("id") String id,
      @RequestBody @Valid ShiftService.UpdateShiftRequest request
  ) {
    if (!Authz.hasRole(authentication, "SUPER_ADMIN") && !Authz.hasRole(authentication, "ADMIN")) {
      Authz.requireRole(authentication, "COORDINATOR");
      Authz.requirePermission(authentication, "MANAGE_SHIFTS");
      if (request != null && (request.valueCents() != null || request.currency() != null)) {
        Authz.requirePermission(authentication, "MANAGE_SHIFT_VALUE");
      }
    }
    return ResponseEntity.ok(shiftService.update(id, request));
  }

  @PostMapping("/{id}/cancel")
  public ResponseEntity<Void> cancel(Authentication authentication, @PathVariable("id") String id) {
    if (!Authz.hasRole(authentication, "SUPER_ADMIN") && !Authz.hasRole(authentication, "ADMIN")) {
      Authz.requireRole(authentication, "COORDINATOR");
      Authz.requirePermission(authentication, "MANAGE_SHIFTS");
    }
    shiftService.cancel(id);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/{id}/check-in")
  public ResponseEntity<ShiftService.ShiftDto> checkIn(@PathVariable("id") String id) {
    return ResponseEntity.ok(shiftService.checkIn(id));
  }

  @PostMapping("/{id}/check-out")
  public ResponseEntity<ShiftService.ShiftDto> checkOut(@PathVariable("id") String id) {
    return ResponseEntity.ok(shiftService.checkOut(id));
  }
}
