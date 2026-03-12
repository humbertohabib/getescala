package com.getescala.config;

import com.zaxxer.hikari.HikariDataSource;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import javax.sql.DataSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.env.Environment;

@Configuration
public class DataSourceConfig {
  @Bean
  @Primary
  DataSource dataSource(Environment env) {
    String url = firstNonBlank(
        env.getProperty("spring.datasource.url"),
        env.getProperty("GETESCALA_DB_URL"),
        env.getProperty("DATABASE_URL")
    );
    if (url == null || url.isBlank()) {
      throw new IllegalStateException("Database URL is missing");
    }

    String username = firstNonBlank(
        env.getProperty("spring.datasource.username"),
        env.getProperty("GETESCALA_DB_USER")
    );
    String password = firstNonBlank(
        env.getProperty("spring.datasource.password"),
        env.getProperty("GETESCALA_DB_PASSWORD")
    );

    ParsedJdbc parsed = parseJdbc(url, username, password);

    HikariDataSource ds = new HikariDataSource();
    ds.setJdbcUrl(parsed.url());
    if (parsed.username() != null) ds.setUsername(parsed.username());
    if (parsed.password() != null) ds.setPassword(parsed.password());
    return ds;
  }

  private static String firstNonBlank(String... values) {
    if (values == null) return null;
    for (String v : values) {
      if (v != null && !v.isBlank()) return v;
    }
    return null;
  }

  private record ParsedJdbc(String url, String username, String password) {}

  private static ParsedJdbc parseJdbc(String rawUrl, String username, String password) {
    String url = rawUrl.trim();
    if (url.startsWith("jdbc:")) {
      return new ParsedJdbc(url, username, password);
    }

    if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
      URI uri = URI.create(url);
      String host = uri.getHost();
      int port = uri.getPort();
      String path = uri.getPath();
      String database = path == null ? null : path.replaceFirst("^/", "");
      String query = uri.getRawQuery();

      String derivedUsername = username;
      String derivedPassword = password;
      String userInfo = uri.getUserInfo();
      if ((derivedUsername == null || derivedUsername.isBlank()) && userInfo != null && !userInfo.isBlank()) {
        int idx = userInfo.indexOf(':');
        if (idx >= 0) {
          derivedUsername = decodeUriComponent(userInfo.substring(0, idx));
          derivedPassword = decodeUriComponent(userInfo.substring(idx + 1));
        } else {
          derivedUsername = decodeUriComponent(userInfo);
        }
      }

      if (host == null || host.isBlank() || database == null || database.isBlank()) {
        throw new IllegalStateException("Invalid PostgreSQL URL");
      }

      String jdbc = "jdbc:postgresql://" + host + (port > 0 ? ":" + port : "") + "/" + database;
      if (query != null && !query.isBlank()) {
        jdbc = jdbc + "?" + query;
      }

      return new ParsedJdbc(jdbc, blankToNull(derivedUsername), blankToNull(derivedPassword));
    }

    return new ParsedJdbc(url, username, password);
  }

  private static String blankToNull(String value) {
    if (value == null) return null;
    String v = value.trim();
    return v.isBlank() ? null : v;
  }

  private static String decodeUriComponent(String value) {
    if (value == null) return null;
    String v = value.replace('+', ' ');
    int pct = v.indexOf('%');
    if (pct < 0) return v;
    byte[] bytes = new byte[v.length()];
    int count = 0;
    for (int i = 0; i < v.length(); i++) {
      char c = v.charAt(i);
      if (c == '%' && i + 2 < v.length()) {
        int hi = Character.digit(v.charAt(i + 1), 16);
        int lo = Character.digit(v.charAt(i + 2), 16);
        if (hi >= 0 && lo >= 0) {
          bytes[count++] = (byte) ((hi << 4) + lo);
          i += 2;
          continue;
        }
      }
      bytes[count++] = (byte) c;
    }
    return new String(bytes, 0, count, StandardCharsets.UTF_8);
  }
}
