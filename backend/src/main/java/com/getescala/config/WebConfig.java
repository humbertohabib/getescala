package com.getescala.config;

import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
  private final String corsAllowedOrigins;

  public WebConfig(
      @Value(
          "${getescala.web.corsAllowedOrigins:http://localhost:5173,https://localhost:5173,https://localhost}"
      )
          String corsAllowedOrigins
  ) {
    this.corsAllowedOrigins = corsAllowedOrigins;
  }

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    String[] origins = Arrays.stream(corsAllowedOrigins.split(",")).map(String::trim).toArray(String[]::new);
    registry.addMapping("/**")
        .allowedOrigins(origins)
        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
        .allowedHeaders("*")
        .allowCredentials(true);
  }
}
