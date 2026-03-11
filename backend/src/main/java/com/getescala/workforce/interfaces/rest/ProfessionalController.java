package com.getescala.workforce.interfaces.rest;

import com.getescala.workforce.application.ProfessionalService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
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
      @RequestBody @Valid ProfessionalService.CreateProfessionalRequest request
  ) {
    return ResponseEntity.ok(professionalService.create(request));
  }
}
