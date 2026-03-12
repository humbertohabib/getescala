package com.getescala.billing.application;

import com.getescala.tenant.TenantContext;
import com.getescala.tenant.infrastructure.persistence.TenantJpaEntity;
import com.getescala.tenant.infrastructure.persistence.TenantJpaRepository;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.stripe.StripeClient;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.Event;
import com.stripe.model.Invoice;
import com.stripe.model.PaymentIntent;
import com.stripe.model.Subscription;
import com.stripe.model.SubscriptionSchedule;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.SubscriptionRetrieveParams;
import com.stripe.param.checkout.SessionCreateParams;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
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

    switch (type) {
      case "checkout.session.completed" -> handleCheckoutSessionCompleted(event);
      case "customer.subscription.created",
          "customer.subscription.updated",
          "customer.subscription.deleted" -> handleSubscriptionEvent(event);
      case "entitlements.active_entitlement_summary.updated" -> handleEntitlementSummaryUpdated(event);
      case "invoice.created",
          "invoice.finalization_failed",
          "invoice.finalized",
          "invoice.paid",
          "invoice.payment_action_required",
          "invoice.payment_failed",
          "invoice.upcoming",
          "invoice.updated" -> handleInvoiceEvent(event);
      case "payment_intent.created",
          "payment_intent.succeeded" -> handlePaymentIntentEvent(event);
      case "subscription_schedule.aborted",
          "subscription_schedule.canceled",
          "subscription_schedule.completed",
          "subscription_schedule.created",
          "subscription_schedule.expiring",
          "subscription_schedule.released",
          "subscription_schedule.updated" -> handleSubscriptionScheduleEvent(event);
      default -> {}
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

  private void handleInvoiceEvent(Event event) {
    Invoice invoice = deserialize(event, Invoice.class);
    if (invoice == null) return;

    String customerId = invoice.getCustomer();
    String subscriptionId = extractSubscriptionId(invoice);

    TenantJpaEntity tenant = findTenantByCustomerOrSubscription(customerId, subscriptionId);
    if (tenant == null) return;

    if (customerId != null && !customerId.isBlank()) {
      tenant.setStripeCustomerId(customerId);
    }

    if (subscriptionId != null && !subscriptionId.isBlank()) {
      updateTenantFromSubscription(tenant, subscriptionId);
    }

    tenantRepository.save(tenant);
  }

  private void handlePaymentIntentEvent(Event event) {
    PaymentIntent paymentIntent = deserialize(event, PaymentIntent.class);
    if (paymentIntent == null) return;

    String customerId = paymentIntent.getCustomer();
    if (customerId == null || customerId.isBlank()) return;

    TenantJpaEntity tenant = tenantRepository.findByStripeCustomerId(customerId).orElse(null);
    if (tenant == null) return;

    tenant.setStripeCustomerId(customerId);

    String subscriptionId = tenant.getStripeSubscriptionId();
    if (subscriptionId != null && !subscriptionId.isBlank()) {
      updateTenantFromSubscription(tenant, subscriptionId);
    }

    tenantRepository.save(tenant);
  }

  private void handleSubscriptionScheduleEvent(Event event) {
    SubscriptionSchedule schedule = deserialize(event, SubscriptionSchedule.class);
    if (schedule == null) return;

    String customerId = schedule.getCustomer();
    String subscriptionId = schedule.getSubscription();

    TenantJpaEntity tenant = findTenantByCustomerOrSubscription(customerId, subscriptionId);
    if (tenant == null) return;

    if (customerId != null && !customerId.isBlank()) {
      tenant.setStripeCustomerId(customerId);
    }

    if (subscriptionId != null && !subscriptionId.isBlank()) {
      updateTenantFromSubscription(tenant, subscriptionId);
    }

    tenantRepository.save(tenant);
  }

  private void handleEntitlementSummaryUpdated(Event event) {
    String customerId = extractStringFromRawJson(event, "customer");
    if (customerId == null || customerId.isBlank()) return;

    TenantJpaEntity tenant = tenantRepository.findByStripeCustomerId(customerId).orElse(null);
    if (tenant == null) return;

    tenant.setStripeCustomerId(customerId);

    String subscriptionId = tenant.getStripeSubscriptionId();
    if (subscriptionId != null && !subscriptionId.isBlank()) {
      updateTenantFromSubscription(tenant, subscriptionId);
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

  private TenantJpaEntity findTenantByCustomerOrSubscription(String customerId, String subscriptionId) {
    TenantJpaEntity tenant = null;
    if (subscriptionId != null && !subscriptionId.isBlank()) {
      tenant = tenantRepository.findByStripeSubscriptionId(subscriptionId).orElse(null);
    }
    if (tenant == null && customerId != null && !customerId.isBlank()) {
      tenant = tenantRepository.findByStripeCustomerId(customerId).orElse(null);
    }
    return tenant;
  }

  private static Integer extractSeatLimit(Subscription subscription) {
    if (subscription.getItems() == null || subscription.getItems().getData() == null) return null;
    if (subscription.getItems().getData().isEmpty()) return null;
    Long quantity = subscription.getItems().getData().getFirst().getQuantity();
    if (quantity == null) return null;
    if (quantity > Integer.MAX_VALUE) return Integer.MAX_VALUE;
    return quantity.intValue();
  }

  private static OffsetDateTime toOffsetDateTime(Long epochSeconds) {
    if (epochSeconds == null) return null;
    try {
      return OffsetDateTime.ofInstant(Instant.ofEpochSecond(epochSeconds), ZoneOffset.UTC);
    } catch (Exception ex) {
      return null;
    }
  }

  private static String extractSubscriptionId(Invoice invoice) {
    if (invoice == null) return null;
    try {
      Invoice.Parent parent = invoice.getParent();
      if (parent == null) return null;
      Invoice.Parent.SubscriptionDetails details = parent.getSubscriptionDetails();
      if (details == null) return null;
      return details.getSubscription();
    } catch (Exception ex) {
      return null;
    }
  }

  private static String extractStringFromRawJson(Event event, String fieldName) {
    if (event == null || fieldName == null || fieldName.isBlank()) return null;
    try {
      JsonObject raw = event.getDataObjectDeserializer().getRawJson();
      if (raw == null) return null;
      JsonElement element = raw.get(fieldName);
      if (element == null || !element.isJsonPrimitive()) return null;
      String value = element.getAsString();
      return value == null || value.isBlank() ? null : value;
    } catch (Exception ex) {
      return null;
    }
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
