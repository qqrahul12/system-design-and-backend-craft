package com.skills.ai.patterns.adapter;

import com.skills.ai.wallet.WalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Adapter Pattern Concrete Implementation:
 * Adapts internal stored-value Fintech Digital Wallet (CineCash) to PaymentGatewayAdapter.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FintechWalletPaymentAdapter implements PaymentGatewayAdapter {

    private final WalletService walletService;

    @Override
    public PaymentResult processPayment(String orderReference, double amount, String description) {
        try {
            WalletService.WalletTransaction txn = walletService.debit(
                    amount,
                    "PURCHASE",
                    description != null ? description : "Payment for " + orderReference
            );
            log.info("💳 [FintechWalletPaymentAdapter] Debited ${} for ref={}, txnId={}", amount, orderReference, txn.txnId());
            return PaymentResult.success(
                    txn.txnId(),
                    getProviderName(),
                    amount,
                    txn.balanceAfter(),
                    "Wallet payment debited successfully from CineMind Cash"
            );
        } catch (Exception ex) {
            log.warn("❌ [FintechWalletPaymentAdapter] Debit failed: {}", ex.getMessage());
            return PaymentResult.failure(getProviderName(), amount, ex.getMessage());
        }
    }

    @Override
    public String getProviderName() {
        return "CINEMIND_WALLET";
    }

    @Override
    public boolean supports(String paymentMethod) {
        if (paymentMethod == null) return false;
        String m = paymentMethod.toUpperCase();
        return m.contains("WALLET") || m.contains("CINECASH") || m.contains("STORED");
    }
}
