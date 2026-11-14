package com.skills.ai.controller;

import com.skills.ai.wallet.WalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST Controller exposing CineMind Fintech Digital Wallet operations.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    @GetMapping
    public ResponseEntity<WalletService.WalletSummary> getWalletSummary() {
        return ResponseEntity.ok(walletService.getWalletSummary());
    }

    @PostMapping("/topup")
    public ResponseEntity<WalletService.WalletTransaction> topUp(@RequestBody Map<String, Object> req) {
        Number amountNum = (Number) req.getOrDefault("amount", 50.0);
        double amount = amountNum != null ? amountNum.doubleValue() : 50.0;
        String method = (String) req.getOrDefault("paymentMethod", "Stripe Instant ACH / Card");
        return ResponseEntity.ok(walletService.topUp(amount, method));
    }

    @PostMapping("/pay")
    public ResponseEntity<WalletService.WalletTransaction> pay(@RequestBody Map<String, Object> req) {
        Number amountNum = (Number) req.getOrDefault("amount", 24.0);
        double amount = amountNum != null ? amountNum.doubleValue() : 24.0;
        String type = (String) req.getOrDefault("type", "TICKET_PAYMENT");
        String desc = (String) req.getOrDefault("description", "CineMind 1-Click Wallet Checkout");
        return ResponseEntity.ok(walletService.debit(amount, type, desc));
    }
}
