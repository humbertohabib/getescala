package com.getescala.billing.infrastructure;

import com.stripe.StripeClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class StripeClientConfig {
  @Bean
  StripeClient stripeClient(@Value("${getescala.billing.stripe.apiKey:}") String apiKey) {
    return new StripeClient(apiKey);
  }
}

