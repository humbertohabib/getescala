package com.getescala.catalog.interfaces.rest;

import com.getescala.catalog.application.ProfessionalProfileCatalogService;
import com.getescala.security.Authz;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/catalog/professional-profile")
public class ProfessionalProfileCatalogController {
  private final ProfessionalProfileCatalogService catalogService;

  public ProfessionalProfileCatalogController(ProfessionalProfileCatalogService catalogService) {
    this.catalogService = catalogService;
  }

  @GetMapping
  public ProfessionalProfileCatalogService.ProfessionalProfileCatalogResponse get(Authentication authentication) {
    Authz.requireAnyRole(authentication, "SUPER_ADMIN", "ADMIN", "COORDINATOR");
    return catalogService.getForCurrentTenant();
  }
}
