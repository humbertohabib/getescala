package com.getescala.backend.dto;

import lombok.Data;
import lombok.AllArgsConstructor;

@Data
@AllArgsConstructor
public class AuthResponse {
    private String accessToken;
    private String tokenType = "Bearer";
    
    public AuthResponse(String accessToken) {
        this.accessToken = accessToken;
    }
}
