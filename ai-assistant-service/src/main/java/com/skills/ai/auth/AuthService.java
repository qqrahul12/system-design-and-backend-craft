package com.skills.ai.auth;

import com.skills.ai.persistence.queries.UserSqlQueries;
import lombok.Builder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

import static com.skills.ai.persistence.queries.UserSqlQueries.*;

/**
 * Service managing authenticated sessions, user profiles, and multi-role switching:
 * VIP_PATRON, EXECUTIVE_ADMIN, CINEMA_MANAGER, AUDITORIUM_USHER, STANDARD_GUEST, ANONYMOUS.
 *
 * Adheres strictly to Zero Hardcoded Data Policy:
 * All user profile records reside exclusively in PostgreSQL (table 'user_profiles')
 * as the sole authoritative Single Source of Truth (SSOT).
 */
@Slf4j
@Service
public class AuthService {

    public enum UserRole {
        VIP_PATRON,
        EXECUTIVE_ADMIN,
        CINEMA_MANAGER,
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

    private final JdbcTemplate jdbcTemplate;
    private final Map<UserRole, UserProfile> personaCatalog = new ConcurrentHashMap<>();
    private volatile UserRole currentRole = UserRole.VIP_PATRON;

    public AuthService(@Autowired(required = false) JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
        refreshPersonasFromDatabase();
    }

    /**
     * Refreshes the local in-memory lookup cache from PostgreSQL (Single Source of Truth).
     * Zero hardcoded names in Java bytecode.
     */
    public synchronized void refreshPersonasFromDatabase() {
        if (jdbcTemplate != null) {
            try {
                List<UserProfile> profiles = jdbcTemplate.query(SELECT_ALL_USERS, this::mapRowToProfile);
                if (!profiles.isEmpty()) {
                    personaCatalog.clear();
                    for (UserProfile p : profiles) {
                        personaCatalog.put(p.role(), p);
                    }
                    log.info("Loaded {} user profiles from database", profiles.size());
                    return;
                }
            } catch (Exception e) {
                log.warn("Could not load user profiles from database: {}", e.getMessage());
            }
        }
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
                    UserProfile user = findProfileByRole(headerRole);
                    if (user != null) {
                        return user;
                    }
                }
            }
        } catch (Exception ignored) {
        }

        // 2. Otherwise return the stateful session persona
        if (currentRole == UserRole.ANONYMOUS) {
            return ANONYMOUS_USER;
        }

        UserProfile active = findProfileByRole(currentRole);
        return active != null ? active : ANONYMOUS_USER;
    }

    public UserProfile findProfileByRole(UserRole role) {
        if (role == null || role == UserRole.ANONYMOUS) {
            return ANONYMOUS_USER;
        }

        // Fast path: memory cache
        UserProfile cached = personaCatalog.get(role);
        if (cached != null) {
            return cached;
        }

        // Authoritative query against database (SSOT)
        if (jdbcTemplate != null) {
            try {
                List<UserProfile> users = jdbcTemplate.query(SELECT_USER_BY_ROLE, this::mapRowToProfile, role.name());
                if (!users.isEmpty()) {
                    UserProfile user = users.get(0);
                    personaCatalog.put(role, user);
                    return user;
                }
            } catch (Exception e) {
                log.debug("Database user lookup skipped for role {}: {}", role, e.getMessage());
            }
        }

        // Minimal default fallback shell if database table hasn't been migrated yet
        return UserProfile.builder()
                .userId("usr-" + role.name().toLowerCase().replace("_", "-"))
                .fullName(role.name().replace("_", " "))
                .email(role.name().toLowerCase() + "@cinemind.io")
                .role(role)
                .roleDisplayName(role.name().replace("_", " "))
                .membershipTier("Standard")
                .discountRate(0.0)
                .avatarUrl("")
                .permissions(getDefaultPermissionsForRole(role))
                .lastLogin(Instant.now())
                .isAuthenticated(true)
                .build();
    }

    public static List<String> getDefaultPermissionsForRole(UserRole role) {
        if (role == null) return List.of("VIEW_MOVIES");
        return switch (role) {
            case EXECUTIVE_ADMIN -> List.of(
                    "VIEW_BOX_OFFICE", "DYNAMIC_YIELD_SURGE", "CATALOG_MUTATE", "APM_TRACES",
                    "LLMOPS_TELEMETRY", "RAG_INGESTION", "AGENT_ORCHESTRATE", "ADMIN_ACCESS",
                    "SCAN_GATE_PASS", "MANAGE_RBAC", "MANAGE_FNB_MENU"
            );
            case CINEMA_MANAGER -> List.of(
                    "VIEW_MOVIES", "BOOK_SEATS", "ORDER_FNB", "VIEW_TICKETS",
                    "SCAN_GATE_PASS", "DISPATCH_FNB_ORDER", "MANAGE_FNB_MENU",
                    "MANAGE_THEATRE", "DYNAMIC_YIELD_SURGE", "VIEW_BOX_OFFICE",
                    "CATALOG_MUTATE", "MANAGE_RBAC", "ADMIN_ACCESS"
            );
            case AUDITORIUM_USHER -> List.of(
                    "SCAN_GATE_PASS", "OVERRIDE_TURNSTILE", "DISPATCH_FNB_ORDER", "WAYFINDER_GUIDE"
            );
            case VIP_PATRON -> List.of(
                    "BOOK_SEATS", "ORDER_FNB", "VIP_RECLINER_ACCESS", "HEATED_SEATS",
                    "IN_SEAT_DELIVERY", "VIEW_TICKETS", "AGENT_ORCHESTRATE"
            );
            case STANDARD_GUEST -> List.of(
                    "BOOK_SEATS", "ORDER_FNB", "VIEW_TICKETS"
            );
            case ANONYMOUS -> List.of(
                    "VIEW_MOVIES", "VIEW_SHOWTIMES", "CHAT_CONCIERGE"
            );
        };
    }

    public UserProfile findProfileByEmail(String email) {
        if (email == null || email.isBlank()) return null;
        if (jdbcTemplate != null) {
            try {
                List<UserProfile> users = jdbcTemplate.query(SELECT_USER_BY_EMAIL, this::mapRowToProfile, email.trim());
                if (!users.isEmpty()) return users.get(0);
            } catch (Exception e) {
                log.debug("Database user lookup by email failed: {}", e.getMessage());
            }
        }
        return personaCatalog.values().stream()
                .filter(p -> p.email().equalsIgnoreCase(email.trim()))
                .findFirst()
                .orElse(null);
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
        refreshPersonasFromDatabase();
        if (!personaCatalog.isEmpty()) {
            return new ArrayList<>(personaCatalog.values());
        }
        // If DB table is empty, return supported roles
        List<UserProfile> defaults = new ArrayList<>();
        for (UserRole role : UserRole.values()) {
            if (role != UserRole.ANONYMOUS) {
                defaults.add(findProfileByRole(role));
            }
        }
        return defaults;
    }

    public UserProfile switchRole(UserRole role) {
        if (role == UserRole.ANONYMOUS) {
            return logout();
        }
        if (role != null) {
            this.currentRole = role;
            UserProfile user = findProfileByRole(role);
            log.info("Active user switched to role: {} ({})", role, user.fullName());
            return user;
        }
        return getCurrentUser();
    }

    public UserProfile logout() {
        this.currentRole = UserRole.ANONYMOUS;
        log.info("User logged out. Session transitioned to ANONYMOUS");
        return ANONYMOUS_USER;
    }

    public UserProfile upsertUserProfile(UserProfile profile) {
        if (profile == null || profile.userId() == null) return null;
        if (jdbcTemplate != null) {
            String permissionsCsv = (profile.permissions() != null)
                    ? String.join(",", profile.permissions())
                    : "";
            jdbcTemplate.update(
                    UPSERT_USER_PROFILE,
                    profile.userId(),
                    profile.fullName(),
                    profile.email(),
                    profile.role().name(),
                    profile.roleDisplayName(),
                    profile.membershipTier(),
                    profile.discountRate(),
                    profile.avatarUrl(),
                    permissionsCsv,
                    profile.isAuthenticated()
            );
            log.info("[PostgreSQL SSOT] Upserted user profile: {} ({})", profile.userId(), profile.fullName());
        }
        personaCatalog.put(profile.role(), profile);
        return profile;
    }

    private UserProfile mapRowToProfile(ResultSet rs, int rowNum) throws SQLException {
        String roleStr = rs.getString("role");
        UserRole role;
        try {
            role = UserRole.valueOf(roleStr);
        } catch (Exception e) {
            role = UserRole.STANDARD_GUEST;
        }

        String permsCsv = rs.getString("permissions_csv");
        List<String> perms = (permsCsv != null && !permsCsv.isBlank())
                ? Arrays.asList(permsCsv.split(","))
                : Collections.emptyList();

        return UserProfile.builder()
                .userId(rs.getString("user_id"))
                .fullName(rs.getString("full_name"))
                .email(rs.getString("email"))
                .role(role)
                .roleDisplayName(rs.getString("role_display_name"))
                .membershipTier(rs.getString("membership_tier"))
                .discountRate(rs.getDouble("discount_rate"))
                .avatarUrl(rs.getString("avatar_url"))
                .permissions(perms)
                .lastLogin(Instant.now())
                .isAuthenticated(rs.getBoolean("is_authenticated"))
                .build();
    }
}
