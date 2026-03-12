package com.getescala.config;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import com.nimbusds.jose.jwk.source.ImmutableSecret;

@Configuration
public class JwtConfig {
  @Bean
  SecretKey jwtSecretKey(@Value("${getescala.security.jwt.secret}") String secret) {
    try {
      byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
      byte[] derived = MessageDigest.getInstance("SHA-256").digest(keyBytes);
      return new SecretKeySpec(derived, "HmacSHA256");
    } catch (Exception ex) {
      throw new IllegalStateException("Invalid JWT secret", ex);
    }
  }

  @Bean
  JwtDecoder jwtDecoder(SecretKey jwtSecretKey) {
    return NimbusJwtDecoder.withSecretKey(jwtSecretKey).macAlgorithm(MacAlgorithm.HS256).build();
  }

  @Bean
  JwtEncoder jwtEncoder(SecretKey jwtSecretKey) {
    return new NimbusJwtEncoder(new ImmutableSecret<>(jwtSecretKey));
  }
}
