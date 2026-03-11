package com.getescala.billing.interfaces.rest;

import com.getescala.billing.application.BillingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/billing")
public class BillingController {
  public record CreateCheckoutSessionRequest(int seatLimit) {}

  private final BillingService billingService;

  public BillingController(BillingService billingService) {
    this.billingService = billingService;
  }

  @PostMapping("/checkout-session")
  public ResponseEntity<BillingService.CheckoutSessionResponse> createCheckoutSession(
      @RequestBody @Valid CreateCheckoutSessionRequest request
  ) {
    return ResponseEntity.ok(billingService.createCheckoutSession(request.seatLimit()));
  }

  @PostMapping("/portal-session")
  public ResponseEntity<BillingService.PortalSessionResponse> createPortalSession() {
    return ResponseEntity.ok(billingService.createPortalSession());
  }
}

