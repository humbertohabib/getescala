package com.getescala.billing.interfaces.rest;

import com.getescala.billing.application.BillingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/billing")
public class StripeWebhookController {
  private final BillingService billingService;

  public StripeWebhookController(BillingService billingService) {
    this.billingService = billingService;
  }

  @PostMapping("/webhook")
  public ResponseEntity<Void> webhook(
      @RequestBody String payload,
      @RequestHeader(name = "Stripe-Signature", required = false) String signature
  ) {
    billingService.handleWebhook(payload, signature);
    return ResponseEntity.ok().build();
  }
}

