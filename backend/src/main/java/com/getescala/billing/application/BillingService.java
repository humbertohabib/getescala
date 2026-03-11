package com.getescala.billing.application;

import com.getescala.tenant.TenantContext;
import com.getescala.tenant.infrastructure.persistence.TenantJpaEntity;
import com.getescala.tenant.infrastructure.persistence.TenantJpaRepository;
import com.stripe.StripeClient;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.Event;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.SubscriptionRetrieveParams;
import com.stripe.param.checkout.SessionCreateParams;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BillingService {
  public record CheckoutSessionResponse(String url) {}

  public record PortalSessionResponse(String url) {}

  private final StripeClient stripeClient;
  private final TenantJpaRepository tenantRepository;
  private final String stripeApiKey;
  private final String webhookSecret;
  private final String pricePerSeatId;
  private final String appUrl;

  public BillingService(
      StripeClient stripeClient,
      TenantJpaRepository tenantRepository,
      @Value("${getescala.billing.stripe.apiKey:}") String stripeApiKey,
      @Value("${getescala.billing.stripe.webhookSecret:}") String webhookSecret,
      @Value("${getescala.billing.stripe.pricePerSeatId:}") String pricePerSeatId,
      @Value("${getescala.billing.stripe.appUrl:http://localhost:5173}") String appUrl
  ) {
    this.stripeClient = stripeClient;
    this.tenantRepository = tenantRepository;
    this.stripeApiKey = stripeApiKey;
    this.webhookSecret = webhookSecret;
    this.pricePerSeatId = pricePerSeatId;
    this.appUrl = appUrl;
  }

  @Transactional
  public CheckoutSessionResponse createCheckoutSession(int seatLimit) {
    ensureBillingConfigured();
    if (seatLimit <= 0) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "seatLimit must be > 0");
    }
    if (pricePerSeatId == null || pricePerSeatId.isBlank()) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "stripe_price_not_configured");
    }

    UUID tenantId = currentTenantId();
    TenantJpaEntity tenant = tenantRepository.findById(tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenant_not_found"));

    String customerId = tenant.getStripeCustomerId();
    if (customerId == null || customerId.isBlank()) {
      customerId = createStripeCustomer(tenantId);
      tenant.setStripeCustomerId(customerId);
      tenantRepository.save(tenant);
    }

    try {
      SessionCreateParams params = SessionCreateParams.builder()
          .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
          .setCustomer(customerId)
          .setSuccessUrl(appUrl + "/dashboard?billing=success")
          .setCancelUrl(appUrl + "/planos?billing=cancel")
          .setClientReferenceId(tenantId.toString())
          .putMetadata("tenantId", tenantId.toString())
          .putMetadata("seatLimit", Integer.toString(seatLimit))
          .setSubscriptionData(
              SessionCreateParams.SubscriptionData.builder()
                  .putMetadata("tenantId", tenantId.toString())
                  .putMetadata("seatLimit", Integer.toString(seatLimit))
                  .build()
          )
          .addLineItem(
              SessionCreateParams.LineItem.builder()
                  .setPrice(pricePerSeatId)
                  .setQuantity((long) seatLimit)
                  .build()
          )
          .build();

      Session session = stripeClient.v1().checkout().sessions().create(params);
      String url = session.getUrl();
      if (url == null || url.isBlank()) {
        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "stripe_checkout_url_missing");
      }
      return new CheckoutSessionResponse(url);
    } catch (StripeException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "stripe_error");
    }
  }

  @Transactional(readOnly = true)
  public PortalSessionResponse createPortalSession() {
    ensureBillingConfigured();
    UUID tenantId = currentTenantId();
    TenantJpaEntity tenant = tenantRepository.findById(tenantId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenant_not_found"));

    String customerId = tenant.getStripeCustomerId();
    if (customerId == null || customerId.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "stripe_customer_not_found");
    }

    try {
      com.stripe.param.billingportal.SessionCreateParams params =
          com.stripe.param.billingportal.SessionCreateParams.builder()
          .setCustomer(customerId)
          .setReturnUrl(appUrl + "/dashboard")
          .build();

      com.stripe.model.billingportal.Session portalSession = stripeClient.v1().billingPortal().sessions().create(params);
      String url = portalSession.getUrl();
      if (url == null || url.isBlank()) {
        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "stripe_portal_url_missing");
      }
      return new PortalSessionResponse(url);
    } catch (StripeException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "stripe_error");
    }
  }

  @Transactional
  public void handleWebhook(String payload, String signatureHeader) {
    ensureBillingConfigured();
    if (webhookSecret == null || webhookSecret.isBlank()) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "stripe_webhook_not_configured");
    }
    if (signatureHeader == null || signatureHeader.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "stripe_signature_missing");
    }

    Event event;
    try {
      event = Webhook.constructEvent(payload, signatureHeader, webhookSecret);
    } catch (SignatureVerificationException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "stripe_signature_invalid");
    }

    String type = event.getType();
    if (type == null) return;

    if (type.equals("checkout.session.completed")) {
      handleCheckoutSessionCompleted(event);
      return;
    }

    if (type.equals("customer.subscription.created")
        || type.equals("customer.subscription.updated")
        || type.equals("customer.subscription.deleted")) {
      handleSubscriptionEvent(event);
    }
  }

  private void handleCheckoutSessionCompleted(Event event) {
    Session session = deserialize(event, Session.class);
    if (session == null) return;

    String tenantIdStr = session.getMetadata() == null ? null : session.getMetadata().get("tenantId");
    if (tenantIdStr == null || tenantIdStr.isBlank()) return;

    UUID tenantId;
    try {
      tenantId = UUID.fromString(tenantIdStr);
    } catch (Exception ex) {
      return;
    }

    TenantJpaEntity tenant = tenantRepository.findById(tenantId).orElse(null);
    if (tenant == null) return;

    String customerId = session.getCustomer();
    if (customerId != null && !customerId.isBlank()) {
      tenant.setStripeCustomerId(customerId);
    }

    String subscriptionId = session.getSubscription();
    if (subscriptionId != null && !subscriptionId.isBlank()) {
      updateTenantFromSubscription(tenant, subscriptionId);
    }

    tenantRepository.save(tenant);
  }

  private void handleSubscriptionEvent(Event event) {
    Subscription subscription = deserialize(event, Subscription.class);
    if (subscription == null) return;

    String subscriptionId = subscription.getId();
    String customerId = subscription.getCustomer();

    TenantJpaEntity tenant = null;
    if (subscriptionId != null && !subscriptionId.isBlank()) {
      tenant = tenantRepository.findByStripeSubscriptionId(subscriptionId).orElse(null);
    }
    if (tenant == null && customerId != null && !customerId.isBlank()) {
      tenant = tenantRepository.findByStripeCustomerId(customerId).orElse(null);
    }
    if (tenant == null) return;

    tenant.setStripeCustomerId(customerId);
    tenant.setStripeSubscriptionId(subscriptionId);
    tenant.setStripeSubscriptionStatus(subscription.getStatus());
    tenant.setStripeCancelAtPeriodEnd(Boolean.TRUE.equals(subscription.getCancelAtPeriodEnd()));

    Integer seatLimit = extractSeatLimit(subscription);
    if (seatLimit != null) {
      tenant.setStripeSeatLimit(seatLimit);
    }

    tenantRepository.save(tenant);
  }

  private void updateTenantFromSubscription(TenantJpaEntity tenant, String subscriptionId) {
    try {
      SubscriptionRetrieveParams params = SubscriptionRetrieveParams.builder().build();
      Subscription subscription = stripeClient.v1().subscriptions().retrieve(subscriptionId, params);
      tenant.setStripeSubscriptionId(subscription.getId());
      tenant.setStripeSubscriptionStatus(subscription.getStatus());
      tenant.setStripeCancelAtPeriodEnd(Boolean.TRUE.equals(subscription.getCancelAtPeriodEnd()));

      Integer seatLimit = extractSeatLimit(subscription);
      if (seatLimit != null) {
        tenant.setStripeSeatLimit(seatLimit);
      }
    } catch (StripeException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "stripe_error");
    }
  }

  private static Integer extractSeatLimit(Subscription subscription) {
    if (subscription.getItems() == null || subscription.getItems().getData() == null) return null;
    if (subscription.getItems().getData().isEmpty()) return null;
    Long quantity = subscription.getItems().getData().getFirst().getQuantity();
    if (quantity == null) return null;
    if (quantity > Integer.MAX_VALUE) return Integer.MAX_VALUE;
    return quantity.intValue();
  }

  private String createStripeCustomer(UUID tenantId) {
    try {
      CustomerCreateParams params = CustomerCreateParams.builder()
          .putMetadata("tenantId", tenantId.toString())
          .build();
      Customer customer = stripeClient.v1().customers().create(params);
      return customer.getId();
    } catch (StripeException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "stripe_error");
    }
  }

  private void ensureBillingConfigured() {
    if (stripeApiKey == null || stripeApiKey.isBlank()) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "billing_not_configured");
    }
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

  private static <T> T deserialize(Event event, Class<T> clazz) {
    try {
      return event.getDataObjectDeserializer()
          .getObject()
          .map(clazz::cast)
          .orElse(null);
    } catch (Exception ex) {
      return null;
    }
  }
}
