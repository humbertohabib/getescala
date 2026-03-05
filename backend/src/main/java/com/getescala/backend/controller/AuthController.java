package com.getescala.backend.controller;

import com.getescala.backend.dto.AuthResponse;
import com.getescala.backend.dto.LoginRequest;
import com.getescala.backend.dto.RegisterRequest;
import com.getescala.backend.model.Usuario;
import com.getescala.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        return ResponseEntity.ok(authService.authenticateUser(loginRequest));
    }

    @PostMapping("/register")
    public ResponseEntity<Usuario> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        Usuario usuario = authService.registerUser(registerRequest);
        return new ResponseEntity<>(usuario, HttpStatus.CREATED);
    }
}
