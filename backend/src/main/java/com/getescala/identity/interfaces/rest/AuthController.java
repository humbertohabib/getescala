package com.getescala.identity.interfaces.rest;

import com.getescala.identity.application.AuthService;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Validated
public class AuthController {
  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  public record SignUpRequest(@NotBlank String tenantName, @Email String email, @NotBlank String password) {}

  public record SignInRequest(String tenantId, @Email String email, @NotBlank String password) {}

  @PostMapping("/sign-up")
  public ResponseEntity<AuthService.AuthResponse> signUp(@RequestBody SignUpRequest request) {
    return ResponseEntity.ok(authService.signUp(request.tenantName(), request.email(), request.password()));
  }

  @PostMapping("/sign-in")
  public ResponseEntity<AuthService.AuthResponse> signIn(@RequestBody SignInRequest request) {
    return ResponseEntity.ok(authService.signIn(request.tenantId(), request.email(), request.password()));
  }
}
