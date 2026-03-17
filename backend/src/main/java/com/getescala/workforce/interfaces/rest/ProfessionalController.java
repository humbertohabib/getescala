package com.getescala.workforce.interfaces.rest;

import com.getescala.security.Authz;
import com.getescala.workforce.application.ProfessionalService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/professionals")
public class ProfessionalController {
  private final ProfessionalService professionalService;

  public ProfessionalController(ProfessionalService professionalService) {
    this.professionalService = professionalService;
  }

  @GetMapping
  public ResponseEntity<List<ProfessionalService.ProfessionalDto>> list() {
    return ResponseEntity.ok(professionalService.list());
  }

  @PostMapping
  public ResponseEntity<ProfessionalService.ProfessionalDto> create(
      Authentication authentication,
      @RequestBody @Valid ProfessionalService.CreateProfessionalRequest request
  ) {
    Authz.requireAnyRole(authentication, "ADMIN", "COORDINATOR");
    return ResponseEntity.ok(professionalService.create(request));
  }

  @PutMapping("/{professionalId}")
  public ResponseEntity<ProfessionalService.ProfessionalDto> update(
      Authentication authentication,
      @PathVariable String professionalId,
      @RequestBody @Valid ProfessionalService.UpdateProfessionalRequest request
  ) {
    Authz.requireAnyRole(authentication, "ADMIN", "COORDINATOR");
    return ResponseEntity.ok(professionalService.update(professionalId, request));
  }

  @DeleteMapping("/{professionalId}")
  public ResponseEntity<ProfessionalService.ProfessionalDto> delete(
      Authentication authentication,
      @PathVariable String professionalId
  ) {
    Authz.requireAnyRole(authentication, "ADMIN", "COORDINATOR");
    return ResponseEntity.ok(professionalService.deactivate(professionalId));
  }

  @PostMapping("/{professionalId}/invite")
  public ResponseEntity<ProfessionalService.InviteResult> invite(
      Authentication authentication,
      @PathVariable String professionalId
  ) {
    Authz.requireAnyRole(authentication, "ADMIN", "COORDINATOR");
    String userId = authentication == null ? null : authentication.getName();
    return ResponseEntity.ok(professionalService.sendInvite(professionalId, userId));
  }
}
