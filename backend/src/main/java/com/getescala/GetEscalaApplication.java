package com.getescala;

import java.net.URI;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class GetEscalaApplication {
  public static void main(String[] args) {
    normalizeDatabaseUrl();
    SpringApplication.run(GetEscalaApplication.class, args);
  }

  private static void normalizeDatabaseUrl() {
    String existing = System.getProperty("spring.datasource.url");
    if (existing != null && !existing.isBlank()) return;

    String candidate = firstNonBlank(
        System.getenv("SPRING_DATASOURCE_URL"),
        System.getenv("GETESCALA_DB_URL"),
        System.getenv("DATABASE_URL")
    );
    if (candidate == null || candidate.isBlank()) return;
    if (candidate.startsWith("jdbc:")) return;

    if (candidate.startsWith("postgres://") || candidate.startsWith("postgresql://")) {
      URI uri = URI.create(candidate);
      String host = uri.getHost();
      if (host == null || host.isBlank()) return;

      int port = uri.getPort() == -1 ? 5432 : uri.getPort();
      String databasePath = uri.getPath();
      if (databasePath == null || databasePath.isBlank() || databasePath.equals("/")) return;

      String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + databasePath;
      String query = uri.getQuery();
      if (query != null && !query.isBlank()) jdbcUrl = jdbcUrl + "?" + query;

      String userInfo = uri.getUserInfo();
      if ((System.getProperty("spring.datasource.username") == null
              && System.getenv("SPRING_DATASOURCE_USERNAME") == null
              && System.getenv("GETESCALA_DB_USER") == null)
          && userInfo != null
          && !userInfo.isBlank()) {
        int colonIndex = userInfo.indexOf(':');
        if (colonIndex >= 0) {
          String username = userInfo.substring(0, colonIndex);
          String password = userInfo.substring(colonIndex + 1);
          if (!username.isBlank()) System.setProperty("spring.datasource.username", username);
          if (!password.isBlank()) System.setProperty("spring.datasource.password", password);
        } else {
          System.setProperty("spring.datasource.username", userInfo);
        }
      }

      System.setProperty("spring.datasource.url", jdbcUrl);
    }
  }

  private static String firstNonBlank(String... values) {
    if (values == null) return null;
    for (String value : values) {
      if (value != null && !value.isBlank()) return value;
    }
    return null;
  }
}
