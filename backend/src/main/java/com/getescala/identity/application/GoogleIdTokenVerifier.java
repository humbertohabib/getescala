package com.getescala.identity.application;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class GoogleIdTokenVerifier {
  public record GoogleIdentity(String email, String subject) {}

  private static final String GOOGLE_JWK_SET_URI = "https://www.googleapis.com/oauth2/v3/certs";
  private static final Set<String> GOOGLE_ISSUERS = Set.of("https://accounts.google.com", "accounts.google.com");

  private final JwtDecoder decoder;
  private final Set<String> allowedAudiences;

  public GoogleIdTokenVerifier(@Value("${getescala.auth.google.clientIds:}") String clientIdsCsv) {
    this.allowedAudiences = parseAudiences(clientIdsCsv);
    this.decoder = buildDecoder(this.allowedAudiences);
  }

  public GoogleIdentity verify(String idToken) {
    if (decoder == null) {
      throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, "google_auth_not_configured");
    }

    Jwt jwt;
    try {
      jwt = decoder.decode(idToken);
    } catch (JwtException ex) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_google_token");
    }

    String email = jwt.getClaimAsString("email");
    Boolean emailVerified = jwt.getClaimAsBoolean("email_verified");
    if (email == null || email.isBlank()) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_google_token");
    }
    if (emailVerified == null || !emailVerified) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "google_email_not_verified");
    }

    String subject = jwt.getSubject();
    if (subject == null || subject.isBlank()) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_google_token");
    }

    return new GoogleIdentity(email.trim().toLowerCase(Locale.ROOT), subject);
  }

  private static JwtDecoder buildDecoder(Set<String> allowedAudiences) {
    if (allowedAudiences.isEmpty()) {
      return null;
    }

    NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(GOOGLE_JWK_SET_URI).build();
    decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
        JwtValidators.createDefault(),
        new GoogleIssuerValidator(),
        new AudienceValidator(allowedAudiences)
    ));
    return decoder;
  }

  private static Set<String> parseAudiences(String csv) {
    if (csv == null || csv.isBlank()) return Set.of();
    return Arrays.stream(csv.split(","))
        .map((value) -> value == null ? "" : value.trim())
        .filter((value) -> !value.isBlank())
        .collect(Collectors.toUnmodifiableSet());
  }

  private static final class AudienceValidator implements OAuth2TokenValidator<Jwt> {
    private final Set<String> allowedAudiences;

    private AudienceValidator(Set<String> allowedAudiences) {
      this.allowedAudiences = allowedAudiences;
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
      boolean ok = token.getAudience().stream().anyMatch(allowedAudiences::contains);
      if (ok) {
        return OAuth2TokenValidatorResult.success();
      }
      OAuth2Error error = new OAuth2Error("invalid_token", "Invalid audience", null);
      return OAuth2TokenValidatorResult.failure(error);
    }
  }

  private static final class GoogleIssuerValidator implements OAuth2TokenValidator<Jwt> {
    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
      String issuer = token.getIssuer() == null ? null : token.getIssuer().toString();
      if (issuer != null && GOOGLE_ISSUERS.contains(issuer)) {
        return OAuth2TokenValidatorResult.success();
      }
      OAuth2Error error = new OAuth2Error("invalid_token", "Invalid issuer", null);
      return OAuth2TokenValidatorResult.failure(error);
    }
  }
}
