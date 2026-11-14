package com.skills.ai.controller;

import com.skills.ai.auth.AuthService;
import com.skills.ai.wallet.WalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Map;

/**
 * REST Controller exposing CineMind Fintech Digital Wallet operations with authentication verification.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<WalletService.WalletSummary> getWalletSummary() {
        AuthService.UserProfile user = authService.getCurrentUser();
        if (user == null || !user.isAuthenticated()) {
            return ResponseEntity.ok(new WalletService.WalletSummary(
                    "WLT-ANONYMOUS",
                    "USD",
                    0.00,
                    0,
                    Collections.emptyList()
            ));
        }
        return ResponseEntity.ok(walletService.getWalletSummary());
    }

    @PostMapping("/topup")
    public ResponseEntity<?> topUp(@RequestBody Map<String, Object> req) {
        AuthService.UserProfile user = authService.getCurrentUser();
        if (user == null || !user.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Sign in required to load CineCash wallet"));
        }
        Number amountNum = (Number) req.getOrDefault("amount", 50.0);
        double amount = amountNum != null ? amountNum.doubleValue() : 50.0;
        String method = (String) req.getOrDefault("paymentMethod", "Stripe Instant ACH / Card");
        return ResponseEntity.ok(walletService.topUp(amount, method));
    }

    @PostMapping("/pay")
    public ResponseEntity<?> pay(@RequestBody Map<String, Object> req) {
        AuthService.UserProfile user = authService.getCurrentUser();
        if (user == null || !user.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Sign in required to debit CineCash wallet"));
        }
        Number amountNum = (Number) req.getOrDefault("amount", 24.0);
        double amount = amountNum != null ? amountNum.doubleValue() : 24.0;
        String type = (String) req.getOrDefault("type", "TICKET_PAYMENT");
        String desc = (String) req.getOrDefault("description", "CineMind 1-Click Wallet Checkout");
        return ResponseEntity.ok(walletService.debit(amount, type, desc));
    }
}
