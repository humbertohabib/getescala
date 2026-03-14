package com.getescala.identity.interfaces.rest;

import com.getescala.identity.application.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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

  public record SignUpRequest(
      @NotBlank(message = "Nome da empresa é obrigatório") String tenantName,
      String organizationTypeId,
      String institutionType,
      @NotBlank(message = "E-mail é obrigatório") @Email(message = "E-mail inválido") String email,
      @NotBlank(message = "Senha é obrigatória") @Size(min = 6, message = "Senha deve ter no mínimo 6 caracteres") String password
  ) {}

  public record SignInRequest(
      String tenantId,
      @NotBlank(message = "E-mail é obrigatório") @Email(message = "E-mail inválido") String email,
      @NotBlank(message = "Senha é obrigatória") String password
  ) {}

  public record GoogleSignInRequest(
      String tenantId,
      @NotBlank(message = "Token do Google é obrigatório") String idToken
  ) {}

  public record GoogleSignUpRequest(
      @NotBlank(message = "Nome da empresa é obrigatório") String tenantName,
      String organizationTypeId,
      String institutionType,
      @NotBlank(message = "Token do Google é obrigatório") String idToken
  ) {}

  @PostMapping("/sign-up")
  public ResponseEntity<AuthService.AuthResponse> signUp(@Valid @RequestBody SignUpRequest request) {
    return ResponseEntity.ok(authService.signUp(
        request.tenantName(),
        request.organizationTypeId(),
        request.institutionType(),
        request.email(),
        request.password()
    ));
  }

  @PostMapping("/sign-in")
  public ResponseEntity<AuthService.AuthResponse> signIn(@Valid @RequestBody SignInRequest request) {
    return ResponseEntity.ok(authService.signIn(request.tenantId(), request.email(), request.password()));
  }

  @PostMapping("/google/sign-in")
  public ResponseEntity<AuthService.AuthResponse> googleSignIn(@Valid @RequestBody GoogleSignInRequest request) {
    return ResponseEntity.ok(authService.googleSignIn(request.tenantId(), request.idToken()));
  }

  @PostMapping("/google/sign-up")
  public ResponseEntity<AuthService.AuthResponse> googleSignUp(@Valid @RequestBody GoogleSignUpRequest request) {
    return ResponseEntity.ok(authService.googleSignUp(
        request.tenantName(),
        request.organizationTypeId(),
        request.institutionType(),
        request.idToken()
    ));
  }
}
