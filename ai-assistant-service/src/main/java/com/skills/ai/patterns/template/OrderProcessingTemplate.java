package com.skills.ai.patterns.template;

import com.skills.ai.patterns.adapter.PaymentGatewayAdapter;
import com.skills.ai.patterns.adapter.PaymentResult;
import lombok.extern.slf4j.Slf4j;

import java.time.Instant;
import java.util.Map;

/**
 * Template Method Pattern Abstract Class:
 * Defines the invariant skeleton of cinema transactional workflows (validation,
 * distributed lock leases, pricing calculation, payment authorization, artifact issuance,
 * and event pub-sub notification) while delegating specific domain steps to subclasses.
 */
@Slf4j
public abstract class OrderProcessingTemplate<TRequest, TArtifact> {

    protected final PaymentGatewayAdapter paymentAdapter;

    protected OrderProcessingTemplate(PaymentGatewayAdapter paymentAdapter) {
        this.paymentAdapter = paymentAdapter;
    }

    /**
     * The Template Method (final to prevent breaking the invariant sequence).
     */
    public final TemplateExecutionResult<TArtifact> processOrder(TRequest request, String paymentMethod) {
        long startTime = System.currentTimeMillis();
        String orderRef = generateOrderReference(request);
        log.info("[TemplateMethod] Starting order workflow: ref={}", orderRef);

        // Step 1: Pre-execution validation (Primitive hook)
        validateRequest(request);

        // Step 2: Distributed lock lease acquisition (Primitive hook)
        String lockToken = acquireResourceLock(request);

        try {
            // Step 3: Compute final pricing with promos / discounts (Primitive hook)
            double calculatedAmount = calculatePricing(request);

            // Step 4: Authorize and debit payment using the Adapter Pattern
            PaymentResult payment = paymentAdapter.processPayment(orderRef, calculatedAmount, getPaymentDescription(request));
            if (!payment.success()) {
                throw new IllegalStateException("Payment authorization declined: " + payment.message());
            }

            // Step 5: Generate domain artifact (Primitive hook)
            TArtifact artifact = generateArtifact(request, payment, lockToken);

            // Step 6: Pub-Sub event broadcast (Hook step)
            publishLifecycleEvent(artifact);

            // Step 7: Record APM telemetry trace (Hook step)
            recordTrace(orderRef, System.currentTimeMillis() - startTime);

            log.info("[TemplateMethod] Workflow completed successfully: ref={}", orderRef);
            return new TemplateExecutionResult<>(true, orderRef, artifact, payment, null, Instant.now());

        } catch (Exception ex) {
            log.error("[TemplateMethod] Workflow aborted for ref={}: {}", orderRef, ex.getMessage());
            onFailureRollback(request, lockToken, ex);
            return new TemplateExecutionResult<>(false, orderRef, null, null, ex.getMessage(), Instant.now());
        }
    }

    // --- Primitive Operations / Hooks implemented by subclasses ---

    protected abstract String generateOrderReference(TRequest request);

    protected abstract void validateRequest(TRequest request);

    protected abstract String acquireResourceLock(TRequest request);

    protected abstract double calculatePricing(TRequest request);

    protected abstract String getPaymentDescription(TRequest request);

    protected abstract TArtifact generateArtifact(TRequest request, PaymentResult payment, String lockToken);

    protected abstract void publishLifecycleEvent(TArtifact artifact);

    protected void onFailureRollback(TRequest request, String lockToken, Exception error) {
        // Default hook for compensatory rollback
    }

    protected void recordTrace(String orderRef, long durationMs) {
        log.debug("Telemetry span recorded for orderRef={} duration={}ms", orderRef, durationMs);
    }

    public record TemplateExecutionResult<TArtifact>(
            boolean success,
            String orderReference,
            TArtifact artifact,
            PaymentResult payment,
            String errorMessage,
            Instant timestamp
    ) {}
}
