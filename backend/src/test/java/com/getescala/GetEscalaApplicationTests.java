package com.getescala;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;

@SpringBootTest
class GetEscalaApplicationTests {
  @Autowired
  JwtEncoder jwtEncoder;

  @Autowired
  JwtDecoder jwtDecoder;

  @Test
  void contextLoads() {}

  @Test
  void jwtRoundTripHs256() {
    Instant now = Instant.now();
    JwtClaimsSet claims = JwtClaimsSet.builder()
        .issuer("getescala-test")
        .issuedAt(now)
        .expiresAt(now.plusSeconds(60))
        .subject("user-id")
        .claim("tenantId", "tenant-id")
        .build();

    String token = jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
        .getTokenValue();

    Jwt decoded = jwtDecoder.decode(token);
    org.junit.jupiter.api.Assertions.assertEquals("user-id", decoded.getSubject());
    org.junit.jupiter.api.Assertions.assertEquals("tenant-id", decoded.getClaimAsString("tenantId"));
  }
}
