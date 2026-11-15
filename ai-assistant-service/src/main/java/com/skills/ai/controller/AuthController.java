package com.skills.ai.controller;

import com.skills.ai.auth.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * REST Controller exposing CineMind authentication and demo multi-role switching.
 *
 * <p>Validation rules enforced before any service call:
 * <ul>
 *   <li>POST /login — email must be non-blank and match RFC 5322 format; role, if supplied, must be a known UserRole enum value.</li>
 *   <li>POST /switch-role — role must be non-blank and a known UserRole enum value.</li>
 * </ul>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$");

    private final AuthService authService;

    @GetMapping("/me")
    public ResponseEntity<AuthService.UserProfile> getCurrentUser() {
        return ResponseEntity.ok(authService.getCurrentUser());
    }

    @GetMapping("/personas")
    public ResponseEntity<List<AuthService.UserProfile>> getPersonas() {
        return ResponseEntity.ok(authService.getAvailablePersonas());
    }

    @PostMapping("/users/batch")
    public ResponseEntity<Map<String, Object>> batchUpsertUsers(@RequestBody List<AuthService.UserProfile> profiles) {
        authService.requireRole(AuthService.UserRole.EXECUTIVE_ADMIN, AuthService.UserRole.CINEMA_MANAGER);
        int count = 0;
        for (AuthService.UserProfile p : profiles) {
            authService.upsertUserProfile(p);
            count++;
        }
        return ResponseEntity.ok(Map.of("status", "SUCCESS", "upserted", count));
    }

    @PostMapping("/switch-role")
    public ResponseEntity<AuthService.UserProfile> switchRole(@RequestBody Map<String, String> req) {
        String roleStr = req.getOrDefault("role", "").trim();
        if (roleStr.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        try {
            AuthService.UserRole targetRole = AuthService.UserRole.valueOf(roleStr.toUpperCase());
            return ResponseEntity.ok(authService.switchRole(targetRole));
        } catch (IllegalArgumentException e) {
            log.warn("switchRole: unknown role '{}' rejected with 400", roleStr);
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthService.UserProfile> login(@RequestBody Map<String, String> req) {
        String email = req.getOrDefault("email", "").trim().toLowerCase();
        String password = req.getOrDefault("password", "");
        String roleStr = req.getOrDefault("role", "").trim();

        // 1. Real cryptographic password authentication (Email + Password)
        if (!email.isBlank() && !password.isBlank()) {
            if (!EMAIL_PATTERN.matcher(email).matches()) {
                log.warn("login: rejected — malformed email '{}'", email);
                return ResponseEntity.badRequest().build();
            }
            AuthService.UserProfile authenticatedUser = authService.authenticateWithPassword(email, password);
            return ResponseEntity.ok(authenticatedUser);
        }

        // 2. Demo 1-Click Persona Switcher (for instant demo exploration)
        if (!roleStr.isBlank()) {
            try {
                AuthService.UserRole targetRole = AuthService.UserRole.valueOf(roleStr.toUpperCase());
                return ResponseEntity.ok(authService.switchRole(targetRole));
            } catch (IllegalArgumentException e) {
                log.warn("login: unknown role '{}' rejected with 400", roleStr);
                return ResponseEntity.badRequest().build();
            }
        }

        log.warn("login: rejected — missing credentials");
        return ResponseEntity.status(401).build();
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout() {
        AuthService.UserProfile guest = authService.logout();
        return ResponseEntity.ok(Map.of(
                "status", "LOGGED_OUT",
                "message", "Successfully signed out of CineMind session",
                "currentUser", guest
        ));
    }
}
