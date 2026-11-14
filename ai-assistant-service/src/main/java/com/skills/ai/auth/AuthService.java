package com.skills.ai.auth;

import lombok.Builder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service managing authenticated sessions, user profiles, and multi-role switching:
 * VIP_PATRON, EXECUTIVE_ADMIN, AUDITORIUM_USHER, and STANDARD_GUEST.
 */
@Slf4j
@Service
public class AuthService {

    public enum UserRole {
        VIP_PATRON,
        EXECUTIVE_ADMIN,
        AUDITORIUM_USHER,
        STANDARD_GUEST,
        ANONYMOUS
    }

    @Builder
    public record UserProfile(
            String userId,
            String fullName,
            String email,
            UserRole role,
            String roleDisplayName,
            String membershipTier,
            double discountRate,
            String avatarUrl,
            List<String> permissions,
            Instant lastLogin,
            boolean isAuthenticated
    ) {}

    public static final UserProfile ANONYMOUS_USER = UserProfile.builder()
            .userId("usr-guest-anon")
            .fullName("Guest Visitor")
            .email("guest@cinemind.io")
            .role(UserRole.ANONYMOUS)
            .roleDisplayName("Guest (Not Signed In)")
            .membershipTier("None")
            .discountRate(0.0)
            .avatarUrl("")
            .permissions(List.of("VIEW_MOVIES", "VIEW_SHOWTIMES", "CHAT_CONCIERGE"))
            .lastLogin(null)
            .isAuthenticated(false)
            .build();

    private final Map<UserRole, UserProfile> personaCatalog = new ConcurrentHashMap<>();
    private volatile UserRole currentRole = UserRole.VIP_PATRON;

    public AuthService() {
        seedPersonas();
    }

    private void seedPersonas() {
        personaCatalog.put(UserRole.VIP_PATRON, UserProfile.builder()
                .userId("usr-vip-001")
                .fullName("Alex Vance")
                .email("alex.vance@cinemind.vip")
                .role(UserRole.VIP_PATRON)
                .roleDisplayName("Gold Lounge VIP Member")
                .membershipTier("CineMind Founder Gold")
                .discountRate(0.20)
                .avatarUrl("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop")
                .permissions(List.of("BOOK_SEATS", "ORDER_FNB", "VIP_RECLINER_ACCESS", "HEATED_SEATS", "IN_SEAT_DELIVERY", "VIEW_TICKETS", "AGENT_ORCHESTRATE"))
                .lastLogin(Instant.now())
                .isAuthenticated(true)
                .build());

        personaCatalog.put(UserRole.EXECUTIVE_ADMIN, UserProfile.builder()
                .userId("usr-adm-002")
                .fullName("Marcus Kane")
                .email("marcus.kane@cinemind-hq.com")
                .role(UserRole.EXECUTIVE_ADMIN)
                .roleDisplayName("Circuit Operations Director")
                .membershipTier("Circuit Executive Admin")
                .discountRate(0.0)
                .avatarUrl("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop")
                .permissions(List.of("VIEW_BOX_OFFICE", "DYNAMIC_YIELD_SURGE", "CATALOG_MUTATE", "APM_TRACES", "LLMOPS_TELEMETRY", "RAG_INGESTION", "AGENT_ORCHESTRATE", "ADMIN_ACCESS", "SCAN_GATE_PASS"))
                .lastLogin(Instant.now())
                .isAuthenticated(true)
                .build());

        personaCatalog.put(UserRole.AUDITORIUM_USHER, UserProfile.builder()
                .userId("usr-ush-003")
                .fullName("Sarah Jenkins")
                .email("sarah.jenkins@cinemind-theaters.com")
                .role(UserRole.AUDITORIUM_USHER)
                .roleDisplayName("Auditorium Floor Usher")
                .membershipTier("Floor Operations Staff")
                .discountRate(0.10)
                .avatarUrl("https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop")
                .permissions(List.of("SCAN_GATE_PASS", "OVERRIDE_TURNSTILE", "DISPATCH_FNB_ORDER", "WAYFINDER_GUIDE"))
                .lastLogin(Instant.now())
                .isAuthenticated(true)
                .build());

        personaCatalog.put(UserRole.STANDARD_GUEST, UserProfile.builder()
                .userId("usr-gst-004")
                .fullName("Jordan Lee")
                .email("jordan.lee@example.com")
                .role(UserRole.STANDARD_GUEST)
                .roleDisplayName("Standard Patron")
                .membershipTier("General Member")
                .discountRate(0.0)
                .avatarUrl("https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop")
                .permissions(List.of("BOOK_SEATS", "ORDER_FNB", "VIEW_TICKETS"))
                .lastLogin(Instant.now())
                .isAuthenticated(true)
                .build());
    }

    public UserProfile getCurrentUser() {
        // 1. Check if request specifies role via header (stateless token / header)
        try {
            org.springframework.web.context.request.RequestAttributes attribs =
                    org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
            if (attribs instanceof org.springframework.web.context.request.ServletRequestAttributes servletAttribs) {
                jakarta.servlet.http.HttpServletRequest request = servletAttribs.getRequest();
                String roleHeader = request.getHeader("X-Role");
                if (roleHeader == null || roleHeader.isBlank()) {
                    String authHeader = request.getHeader("Authorization");
                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
                        roleHeader = authHeader.substring(7).trim();
                    }
                }
                if (roleHeader != null && !roleHeader.isBlank()) {
                    UserRole headerRole = UserRole.valueOf(roleHeader.toUpperCase().trim());
                    if (headerRole == UserRole.ANONYMOUS) {
                        return ANONYMOUS_USER;
                    }
                    if (personaCatalog.containsKey(headerRole)) {
                        return personaCatalog.get(headerRole);
                    }
                }
            }
        } catch (Exception ignored) {
        }

        // 2. Otherwise return the stateful session persona
        if (currentRole == UserRole.ANONYMOUS) {
            return ANONYMOUS_USER;
        }
        return personaCatalog.getOrDefault(currentRole, personaCatalog.get(UserRole.VIP_PATRON));
    }

    public boolean isAuthenticated() {
        return getCurrentUser().isAuthenticated();
    }

    public boolean hasRole(UserRole... roles) {
        UserProfile user = getCurrentUser();
        if (!user.isAuthenticated()) return false;
        for (UserRole r : roles) {
            if (user.role() == r) return true;
        }
        return false;
    }

    public boolean hasPermission(String permission) {
        UserProfile user = getCurrentUser();
        if (!user.isAuthenticated() || user.permissions() == null) return false;
        return user.permissions().contains(permission);
    }

    public void requireAuthenticated() {
        if (!isAuthenticated()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "Authentication required to access this resource"
            );
        }
    }

    public void requireRole(UserRole... roles) {
        requireAuthenticated();
        if (!hasRole(roles)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Access denied: Requires role " + Arrays.toString(roles)
            );
        }
    }

    public void requirePermission(String permission) {
        requireAuthenticated();
        if (!hasPermission(permission)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Access denied: Missing required permission " + permission
            );
        }
    }

    public List<UserProfile> getAvailablePersonas() {
        return new ArrayList<>(personaCatalog.values());
    }

    public UserProfile switchRole(UserRole role) {
        if (role == UserRole.ANONYMOUS) {
            return logout();
        }
        if (role != null && personaCatalog.containsKey(role)) {
            this.currentRole = role;
            log.info("👤 Active user switched to role: {} ({})", role, getCurrentUser().fullName());
        }
        return getCurrentUser();
    }

    public UserProfile logout() {
        this.currentRole = UserRole.ANONYMOUS;
        log.info("🚪 User logged out. Session transitioned to ANONYMOUS");
        return ANONYMOUS_USER;
    }
}
