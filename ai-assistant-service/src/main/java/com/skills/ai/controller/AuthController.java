package com.skills.ai.controller;

import com.skills.ai.auth.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST Controller exposing CineMind authentication and demo multi-role switching.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @GetMapping("/me")
    public ResponseEntity<AuthService.UserProfile> getCurrentUser() {
        return ResponseEntity.ok(authService.getCurrentUser());
    }

    @GetMapping("/personas")
    public ResponseEntity<List<AuthService.UserProfile>> getPersonas() {
        return ResponseEntity.ok(authService.getAvailablePersonas());
    }

    @PostMapping("/switch-role")
    public ResponseEntity<AuthService.UserProfile> switchRole(@RequestBody Map<String, String> req) {
        String roleStr = req.getOrDefault("role", "VIP_PATRON");
        try {
            AuthService.UserRole targetRole = AuthService.UserRole.valueOf(roleStr.toUpperCase().trim());
            return ResponseEntity.ok(authService.switchRole(targetRole));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthService.UserProfile> login(@RequestBody Map<String, String> req) {
        // Idempotent login for demo session
        String email = req.getOrDefault("email", "alex.vance@cinemind.vip");
        AuthService.UserRole role = email.contains("admin") ? AuthService.UserRole.EXECUTIVE_ADMIN
                : email.contains("usher") ? AuthService.UserRole.AUDITORIUM_USHER
                : AuthService.UserRole.VIP_PATRON;
        return ResponseEntity.ok(authService.switchRole(role));
    }
}
