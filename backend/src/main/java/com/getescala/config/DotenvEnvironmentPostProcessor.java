package com.getescala.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

public class DotenvEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {
  @Override
  public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
    Path path = resolveDotenvPath();
    if (path == null) return;

    Map<String, Object> properties = readDotenv(path);
    if (properties.isEmpty()) return;

    MapPropertySource propertySource = new MapPropertySource("dotenv:" + path.toAbsolutePath(), properties);

    if (environment.getPropertySources().contains(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME)) {
      environment.getPropertySources().addAfter(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME, propertySource);
    } else {
      environment.getPropertySources().addLast(propertySource);
    }
  }

  @Override
  public int getOrder() {
    return Ordered.HIGHEST_PRECEDENCE;
  }

  private static Path resolveDotenvPath() {
    Path local = findFirstExisting(".env.local", ".env");
    if (local != null) return local;
    Path backendLocal = findFirstExisting("backend/.env.local", "backend/.env");
    if (backendLocal != null) return backendLocal;
    return null;
  }

  private static Path findFirstExisting(String... candidates) {
    for (String candidate : candidates) {
      Path path = Paths.get(candidate);
      if (Files.exists(path) && Files.isRegularFile(path)) {
        return path;
      }
    }
    return null;
  }

  private static Map<String, Object> readDotenv(Path path) {
    List<String> lines;
    try {
      lines = Files.readAllLines(path, StandardCharsets.UTF_8);
    } catch (IOException ex) {
      return Map.of();
    }

    Map<String, Object> out = new LinkedHashMap<>();
    for (String rawLine : lines) {
      if (rawLine == null) continue;
      String line = rawLine.trim();
      if (line.isEmpty()) continue;
      if (line.startsWith("#")) continue;

      int eq = line.indexOf('=');
      if (eq <= 0) continue;

      String key = line.substring(0, eq).trim();
      if (key.isEmpty()) continue;

      String value = line.substring(eq + 1).trim();
      value = stripQuotes(value);
      out.put(key, value);
    }
    return out;
  }

  private static String stripQuotes(String value) {
    if (value == null) return "";
    if (value.length() >= 2) {
      char first = value.charAt(0);
      char last = value.charAt(value.length() - 1);
      if ((first == '"' && last == '"') || (first == '\'' && last == '\'')) {
        return value.substring(1, value.length() - 1);
      }
    }
    return value;
  }
}
