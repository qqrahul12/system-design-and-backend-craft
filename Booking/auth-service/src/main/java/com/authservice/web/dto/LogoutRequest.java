package com.authservice.web.dto;

public record LogoutRequest(
        String refreshToken,
        String accessTokenJti,
        Boolean globalLogout
) {
}
